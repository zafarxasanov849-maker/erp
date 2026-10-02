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

-- =====================================================================
-- Darslarni o'zgartirish: reja TS'da (src/lib/schedule.ts, testlangan), qo'llash — bu yerda,
-- bitta tranzaksiyada va ruxsat tekshiruvi bilan.
-- =====================================================================

-- Foydalanuvchi so'rovi bo'lsa ruxsatni tekshiradi; service role (cron) va postgres — tekshiruvsiz.
create or replace function public.assert_group_editor(p_group uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid;
  v_branch uuid;
begin
  select organization_id, branch_id into v_org, v_branch from groups where id = p_group;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not (
       (has_permission(v_org, 'groups.create') or has_permission(v_org, 'groups.update'))
       and can_see_branch(v_org, v_branch)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_org;
end $$;

-- p_insert: [{date, startTime, endTime, status, cancelReason, holidayId}]
-- p_update: [{id, endTime, status, cancelReason?, holidayId}] — cancelReason kaliti bo'lmasa o'zgarmaydi
create or replace function public.apply_lesson_plan(
  p_group uuid,
  p_insert jsonb,
  p_remove uuid[],
  p_update jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := assert_group_editor(p_group);
begin
  -- Davomati bor yoki o'tgan darslar hech qachon olib tashlanmaydi
  delete from lessons l
   where l.id = any (coalesce(p_remove, '{}')) and l.group_id = p_group
     and l.status <> 'held'
     and not exists (select 1 from attendance a where a.lesson_id = l.id);

  insert into lessons (organization_id, group_id, date, start_time, end_time, status, cancel_reason, cancel_holiday_id)
  select v_org, p_group, (x ->> 'date')::date, (x ->> 'startTime')::time, (x ->> 'endTime')::time,
         (x ->> 'status')::lesson_status, x ->> 'cancelReason', (x ->> 'holidayId')::uuid
    from jsonb_array_elements(coalesce(p_insert, '[]')) x
  on conflict (group_id, date, start_time) do nothing;

  update lessons l
     set end_time = (x ->> 'endTime')::time,
         status = (x ->> 'status')::lesson_status,
         cancel_reason = case when x ? 'cancelReason' then x ->> 'cancelReason' else l.cancel_reason end,
         cancel_holiday_id = (x ->> 'holidayId')::uuid
    from jsonb_array_elements(coalesce(p_update, '[]')) x
   where l.id = (x ->> 'id')::uuid and l.group_id = p_group and l.status <> 'held';
end $$;

-- Bayram: o'sha kundagi rejali (davomatsiz) darslarni bekor qiladi. Bekor qilingan darslar id'lari qaytadi
-- (5-bosqich: pulni qaytarish shu ro'yxat bo'yicha).
create or replace function public.apply_holiday(p_holiday uuid)
returns setof uuid language plpgsql security definer set search_path = public as $$
declare
  v_h holidays%rowtype;
begin
  select * into v_h from holidays where id = p_holiday;
  if v_h.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not has_permission(v_h.organization_id, 'settings.catalogs') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  update lessons l
     set status = 'cancelled', cancel_reason = v_h.reason, cancel_holiday_id = v_h.id
    from groups g
   where g.id = l.group_id
     and l.organization_id = v_h.organization_id
     and l.date = v_h.date
     and l.status = 'scheduled'
     and (v_h.branch_id is null or g.branch_id = v_h.branch_id)
     and not exists (select 1 from attendance a where a.lesson_id = l.id)
  returning l.id;
end $$;

-- Bayramni o'chirish: uning sababli bekor bo'lgan darslar tiklanadi (shu kuni boshqa bayram bo'lsa — o'shanga
-- ko'ra yana bekor qilinadi). Tiklangan darslar id'lari qaytadi.
create or replace function public.remove_holiday(p_holiday uuid)
returns setof uuid language plpgsql security definer set search_path = public as $$
declare
  v_h holidays%rowtype;
  v_other uuid;
begin
  select * into v_h from holidays where id = p_holiday;
  if v_h.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not has_permission(v_h.organization_id, 'settings.catalogs') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  create temp table if not exists _restored (id uuid) on commit drop;
  truncate _restored;
  with r as (
    update lessons
       set status = 'scheduled', cancel_reason = null, cancel_holiday_id = null
     where cancel_holiday_id = v_h.id
    returning id
  )
  insert into _restored select id from r;

  delete from holidays where id = v_h.id;

  for v_other in
    select id from holidays where organization_id = v_h.organization_id and date = v_h.date
  loop
    perform apply_holiday(v_other);
  end loop;

  return query
  select r.id from _restored r join lessons l on l.id = r.id where l.status = 'scheduled';
end $$;

revoke execute on function public.assert_group_editor(uuid) from public, anon;
revoke execute on function public.apply_lesson_plan(uuid, jsonb, uuid[], jsonb) from public, anon;
revoke execute on function public.apply_holiday(uuid) from public, anon;
revoke execute on function public.remove_holiday(uuid) from public, anon;
grant execute on function public.assert_group_editor(uuid) to authenticated, service_role;
grant execute on function public.apply_lesson_plan(uuid, jsonb, uuid[], jsonb) to authenticated, service_role;
grant execute on function public.apply_holiday(uuid) to authenticated, service_role;
grant execute on function public.remove_holiday(uuid) to authenticated, service_role;
