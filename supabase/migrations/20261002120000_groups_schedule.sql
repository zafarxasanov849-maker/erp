-- =====================================================================
-- 2-bosqich: kurslar, xonalar, guruhlar, darslar, bayramlar.
-- =====================================================================

-- Audit: foydalanuvchi o'chirilsa, uning yozuvlari qoladi (muallifsiz).
alter table audit_log drop constraint audit_log_actor_id_fkey;
alter table audit_log add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references profiles (id) on delete set null;

-- ---------- Cheklovlar ----------
alter table courses add constraint courses_lesson_minutes_chk check (lesson_minutes between 15 and 600);
alter table courses add constraint courses_name_uniq unique (organization_id, name);
alter table rooms add constraint rooms_name_uniq unique (branch_id, name);
alter table rooms add constraint rooms_capacity_chk check (capacity is null or capacity > 0);
alter table groups add constraint groups_weekdays_not_empty check (cardinality(weekdays) > 0);
alter table groups add constraint groups_dates_chk check (end_date is null or end_date >= start_date);

-- Bitta kunga bitta bayram (filial yoki butun markaz uchun)
create unique index holidays_uniq
  on holidays (organization_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), date);
create index on holidays (organization_id, date);

-- Bayram sababli bekor qilingan dars → qaysi bayram (bayram o'chirilsa dars tiklanadi).
alter table lessons add column cancel_holiday_id uuid references holidays (id) on delete set null;
create index on lessons (group_id, date);
create index on lessons (cancel_holiday_id) where cancel_holiday_id is not null;
create index on groups (organization_id, teacher_id);
create index on groups (organization_id, room_id);

-- ---------- Bir markaz ichida bog'lanish (hamma uchun, service role ham) ----------
create or replace function public.groups_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from branches where id = new.branch_id and organization_id = new.organization_id) then
    raise exception 'group_branch_mismatch' using errcode = 'P0001';
  end if;
  if not exists (select 1 from courses where id = new.course_id and organization_id = new.organization_id) then
    raise exception 'group_course_mismatch' using errcode = 'P0001';
  end if;
  if new.teacher_id is not null and not exists (
    select 1 from staff where id = new.teacher_id and organization_id = new.organization_id and is_teacher) then
    raise exception 'group_teacher_mismatch' using errcode = 'P0001';
  end if;
  -- Xona shu guruh filialida bo'lishi kerak
  if new.room_id is not null and not exists (
    select 1 from rooms where id = new.room_id and organization_id = new.organization_id
      and branch_id = new.branch_id) then
    raise exception 'group_room_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger groups_integrity
  before insert or update on groups
  for each row execute function public.groups_integrity();

create or replace function public.rooms_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from branches where id = new.branch_id and organization_id = new.organization_id) then
    raise exception 'room_branch_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger rooms_integrity
  before insert or update on rooms
  for each row execute function public.rooms_integrity();

create or replace function public.holidays_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.branch_id is not null and not exists (
    select 1 from branches where id = new.branch_id and organization_id = new.organization_id) then
    raise exception 'holiday_branch_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger holidays_integrity
  before insert or update on holidays
  for each row execute function public.holidays_integrity();

create or replace function public.lessons_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from groups where id = new.group_id and organization_id = new.organization_id) then
    raise exception 'lesson_group_mismatch' using errcode = 'P0001';
  end if;
  if new.cancel_holiday_id is not null and not exists (
    select 1 from holidays where id = new.cancel_holiday_id and organization_id = new.organization_id) then
    raise exception 'lesson_holiday_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger lessons_integrity
  before insert or update on lessons
  for each row execute function public.lessons_integrity();

revoke execute on function public.groups_integrity() from public, anon, authenticated;
revoke execute on function public.rooms_integrity() from public, anon, authenticated;
revoke execute on function public.holidays_integrity() from public, anon, authenticated;
revoke execute on function public.lessons_integrity() from public, anon, authenticated;

-- ---------- Audit ----------
create trigger audit_courses after insert or update or delete on courses
  for each row execute function public.audit_row();
create trigger audit_rooms after insert or update or delete on rooms
  for each row execute function public.audit_row();
create trigger audit_groups after insert or update or delete on groups
  for each row execute function public.audit_row();
create trigger audit_holidays after insert or update or delete on holidays
  for each row execute function public.audit_row();
-- Darslar ko'p (cron yaratadi) — faqat qo'lda o'zgarishlar (bekor qilish, mavzu) muhim:
create trigger audit_lessons after update on lessons
  for each row
  when (old.status is distinct from new.status or old.topic is distinct from new.topic
        or old.homework is distinct from new.homework)
  execute function public.audit_row();
