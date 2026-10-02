-- =====================================================================
-- 3-bosqich: talabalar, a'zoliklar (enrollments), muzlatish, teglar, izohlar.
-- =====================================================================

create or replace function public.today_tashkent()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Tashkent')::date
$$;

-- ---------- Bir markaz ichida bog'lanish ----------
create or replace function public.students_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from branches where id = new.branch_id and organization_id = new.organization_id) then
    raise exception 'student_branch_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger students_integrity
  before insert or update on students
  for each row execute function public.students_integrity();

create or replace function public.enrollments_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from students where id = new.student_id and organization_id = new.organization_id) then
    raise exception 'enrollment_student_mismatch' using errcode = 'P0001';
  end if;
  if not exists (select 1 from groups where id = new.group_id and organization_id = new.organization_id) then
    raise exception 'enrollment_group_mismatch' using errcode = 'P0001';
  end if;
  if new.leave_reason_id is not null and not exists (
    select 1 from reasons where id = new.leave_reason_id and organization_id = new.organization_id and kind = 'leave') then
    raise exception 'reason_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger enrollments_integrity
  before insert or update on enrollments
  for each row execute function public.enrollments_integrity();

create or replace function public.freezes_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from enrollments where id = new.enrollment_id and organization_id = new.organization_id) then
    raise exception 'freeze_enrollment_mismatch' using errcode = 'P0001';
  end if;
  if new.reason_id is not null and not exists (
    select 1 from reasons where id = new.reason_id and organization_id = new.organization_id and kind = 'freeze') then
    raise exception 'reason_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger freezes_integrity
  before insert or update on freezes
  for each row execute function public.freezes_integrity();

revoke execute on function public.students_integrity() from public, anon, authenticated;
revoke execute on function public.enrollments_integrity() from public, anon, authenticated;
revoke execute on function public.freezes_integrity() from public, anon, authenticated;

create index on enrollments (student_id);
create index on freezes (enrollment_id);
create index on student_notes (student_id, created_at desc);
create index on student_tags (tag_id);
create index on audit_log (entity, entity_id);

-- ---------- Audit ----------
-- student_tags da organization_id va id yo'q — talaba orqali aniqlanadi.
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_org uuid;
  v_id uuid;
  v_diff jsonb;
begin
  if tg_table_name = 'organizations' then
    v_org := (v_row ->> 'id')::uuid;
    v_id := v_org;
  elsif tg_table_name = 'staff_branches' then
    select organization_id into v_org from staff where id = (v_row ->> 'staff_id')::uuid;
    v_id := (v_row ->> 'staff_id')::uuid;
  elsif tg_table_name = 'student_tags' then
    select organization_id into v_org from students where id = (v_row ->> 'student_id')::uuid;
    v_id := (v_row ->> 'student_id')::uuid;
  else
    v_org := (v_row ->> 'organization_id')::uuid;
    v_id := (v_row ->> 'id')::uuid;
  end if;

  if v_org is null or not exists (select 1 from organizations where id = v_org) then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    select jsonb_object_agg(e.key, jsonb_build_object('old', v_old -> e.key, 'new', e.value))
      into v_diff
      from jsonb_each(v_new) e
     where v_new -> e.key is distinct from v_old -> e.key;
    if v_diff is null then
      return new;
    end if;
  else
    v_diff := v_row;
  end if;

  insert into audit_log (organization_id, actor_id, action, entity, entity_id, diff)
  values (v_org, auth.uid(), tg_table_name || '.' || lower(tg_op), tg_table_name, v_id, v_diff);
  return coalesce(new, old);
end $$;

create trigger audit_students after insert or update or delete on students
  for each row execute function public.audit_row();
create trigger audit_enrollments after insert or update or delete on enrollments
  for each row execute function public.audit_row();
create trigger audit_freezes after insert or update or delete on freezes
  for each row execute function public.audit_row();
create trigger audit_student_tags after insert or delete on student_tags
  for each row execute function public.audit_row();
create trigger audit_student_notes after insert or update or delete on student_notes
  for each row execute function public.audit_row();

-- ---------- Ro'yxat uchun ko'rinish (RLS chaqiruvchi nomidan) ----------
-- Holat PRD §6: active > trial > frozen > left; arxivlangan alohida.
create view public.students_overview with (security_invoker = true) as
select
  s.id,
  s.organization_id,
  s.branch_id,
  s.full_name,
  s.phone,
  s.parent_phone,
  s.joined_at,
  s.archived_at,
  s.created_at,
  case
    when s.archived_at is not null then 'archived'
    when bool_or(e.status = 'active') then 'active'
    when bool_or(e.status = 'trial') then 'trial'
    when bool_or(e.status = 'frozen') then 'frozen'
    when bool_or(e.status = 'left') then 'left'
    else 'new'
  end as status,
  coalesce(array_agg(distinct e.group_id) filter (where e.status <> 'left'), '{}') as group_ids,
  coalesce(array_agg(distinct g.course_id) filter (where e.status <> 'left' and g.id is not null), '{}') as course_ids,
  coalesce(array_agg(distinct g.teacher_id) filter (where e.status <> 'left' and g.teacher_id is not null), '{}') as teacher_ids,
  coalesce((select array_agg(st.tag_id) from student_tags st where st.student_id = s.id), '{}') as tag_ids
from students s
left join enrollments e on e.student_id = s.id
left join groups g on g.id = e.group_id
group by s.id;

grant select on public.students_overview to authenticated;
revoke select on public.students_overview from anon;

-- =====================================================================
-- A'zolik amallari: SECURITY DEFINER + aniq ruxsat tekshiruvi, bitta tranzaksiyada.
-- =====================================================================

-- Talabani tahrirlash huquqi: students.update + filial. Qaytaradi: markaz id.
create or replace function public.assert_student_editor(p_student uuid, p_perm text default 'students.update')
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid;
  v_branch uuid;
begin
  select organization_id, branch_id into v_org, v_branch from students where id = p_student;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not (has_permission(v_org, p_perm) and can_see_branch(v_org, v_branch)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v_org;
end $$;

-- Guruh shu markazda, faol va foydalanuvchiga ko'rinadi.
create or replace function public.assert_enrollable_group(p_org uuid, p_group uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare
  v_branch uuid;
  v_active boolean;
begin
  select branch_id, is_active into v_branch, v_active from groups where id = p_group and organization_id = p_org;
  if v_branch is null then
    raise exception 'enrollment_group_mismatch' using errcode = 'P0001';
  end if;
  if not v_active then
    raise exception 'group_finished' using errcode = 'P0001';
  end if;
  if auth.uid() is not null and not can_see_branch(p_org, v_branch) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

-- Yangi a'zolik. p_status: trial | active.
create or replace function public.enroll_student(p_student uuid, p_group uuid, p_status text, p_date date)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := assert_student_editor(p_student, 'students.create');
  v_id uuid;
begin
  if p_status not in ('trial', 'active') or p_date is null then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if exists (select 1 from students where id = p_student and archived_at is not null) then
    raise exception 'student_archived' using errcode = 'P0001';
  end if;
  perform assert_enrollable_group(v_org, p_group);
  if exists (select 1 from enrollments where student_id = p_student and group_id = p_group and status <> 'left') then
    raise exception 'already_enrolled' using errcode = 'P0001';
  end if;

  insert into enrollments (organization_id, student_id, group_id, status, joined_at, activated_at)
  values (v_org, p_student, p_group, p_status::enrollment_status, p_date,
          case when p_status = 'active' then p_date end)
  returning id into v_id;
  return v_id;
end $$;

-- Talaba + teglar + a'zoliklar (Talaba qo'shish paneli). Qaytaradi: {student_id, enrollments: [{id, status, date}]}
create or replace function public.create_student(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_branch uuid := (p ->> 'branch_id')::uuid;
  v_org uuid;
  v_student uuid;
  v_e jsonb;
  v_enr jsonb := '[]'::jsonb;
  v_eid uuid;
begin
  select organization_id into v_org from branches where id = v_branch;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not (has_permission(v_org, 'students.create') and can_see_branch(v_org, v_branch)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into students (organization_id, branch_id, full_name, phone, gender, birth_date, parent_name, parent_phone,
                        telegram_username, address, school, passport_series, joined_at)
  values (v_org, v_branch, p ->> 'full_name', p ->> 'phone', (p ->> 'gender')::gender, (p ->> 'birth_date')::date,
          p ->> 'parent_name', p ->> 'parent_phone', p ->> 'telegram_username', p ->> 'address', p ->> 'school',
          p ->> 'passport_series', coalesce((p ->> 'joined_at')::date, today_tashkent()))
  returning id into v_student;

  insert into student_tags (student_id, tag_id)
  select v_student, t.id from tags t
   where t.organization_id = v_org
     and t.id in (select (jsonb_array_elements_text(coalesce(p -> 'tag_ids', '[]'))) ::uuid);

  for v_e in select * from jsonb_array_elements(coalesce(p -> 'enrollments', '[]')) loop
    v_eid := enroll_student(v_student, (v_e ->> 'group_id')::uuid, v_e ->> 'status', (v_e ->> 'date')::date);
    v_enr := v_enr || jsonb_build_object('id', v_eid, 'status', v_e ->> 'status', 'date', v_e ->> 'date');
  end loop;

  return jsonb_build_object('student_id', v_student, 'enrollments', v_enr);
end $$;

-- Sinovdan faollashtirish
create or replace function public.activate_enrollment(p_enrollment uuid, p_date date)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_e enrollments%rowtype;
begin
  select * into v_e from enrollments where id = p_enrollment;
  if v_e.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform assert_student_editor(v_e.student_id);
  if v_e.status <> 'trial' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if p_date is null or p_date < v_e.joined_at then
    raise exception 'date_before_join' using errcode = 'P0001';
  end if;
  update enrollments set status = 'active', activated_at = p_date where id = p_enrollment;
end $$;

-- Chiqarish: sana (a'zolik boshlanganidan oldin emas) va sabab majburiy
create or replace function public.leave_enrollment(p_enrollment uuid, p_date date, p_reason uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_e enrollments%rowtype;
begin
  select * into v_e from enrollments where id = p_enrollment;
  if v_e.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  perform assert_student_editor(v_e.student_id);
  if v_e.status = 'left' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if p_reason is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_date is null or p_date < v_e.joined_at then
    raise exception 'date_before_join' using errcode = 'P0001';
  end if;
  update enrollments set status = 'left', left_at = p_date, leave_reason_id = p_reason where id = p_enrollment;
end $$;

-- Boshqa guruhga o'tkazish: eski a'zolik p_date dan oldingi kun bilan "chiqqan", yangisi p_date dan.
-- Sinovdagi talaba sinovda, qolganlar faol bo'lib o'tadi. Qaytaradi: yangi a'zolik id.
create or replace function public.transfer_enrollment(p_enrollment uuid, p_new_group uuid, p_date date, p_reason uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_e enrollments%rowtype;
  v_org uuid;
  v_new uuid;
begin
  select * into v_e from enrollments where id = p_enrollment;
  if v_e.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_org := assert_student_editor(v_e.student_id);
  if v_e.status = 'left' then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if p_new_group = v_e.group_id then
    raise exception 'already_enrolled' using errcode = 'P0001';
  end if;
  if p_date is null or p_date <= v_e.joined_at then
    raise exception 'date_before_join' using errcode = 'P0001';
  end if;

  update enrollments set status = 'left', left_at = p_date - 1, leave_reason_id = p_reason where id = p_enrollment;
  v_new := enroll_student(v_e.student_id, p_new_group,
                          case when v_e.status = 'trial' then 'trial' else 'active' end, p_date);
  return v_new;
end $$;

-- Muzlatish holatlarini bugungi sanaga moslash (amallardan keyin va har kecha cron'da).
create or replace function public.refresh_enrollment_statuses(p_org uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_today date := today_tashkent();
  v_count integer;
begin
  if auth.uid() is not null and (p_org is null or not is_member(p_org)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  with target as (
    select e.id,
           case when exists (select 1 from freezes f where f.enrollment_id = e.id
                              and v_today between f.date_from and f.date_to)
                then 'frozen'::enrollment_status else 'active'::enrollment_status end as new_status
      from enrollments e
     where e.status in ('active', 'frozen')
       and (p_org is null or e.organization_id = p_org)
  )
  update enrollments e set status = t.new_status
    from target t
   where e.id = t.id and e.status <> t.new_status;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Muzlatish: faol (yoki muzlatilgan) a'zolik, oraliq boshqa muzlatish bilan kesishmaydi.
create or replace function public.freeze_enrollment(p_enrollment uuid, p_from date, p_to date, p_reason uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_e enrollments%rowtype;
  v_org uuid;
  v_id uuid;
begin
  select * into v_e from enrollments where id = p_enrollment;
  if v_e.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_org := assert_student_editor(v_e.student_id);
  if v_e.status not in ('active', 'frozen') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_from < coalesce(v_e.activated_at, v_e.joined_at) then
    raise exception 'date_before_join' using errcode = 'P0001';
  end if;
  if exists (select 1 from freezes where enrollment_id = p_enrollment
              and daterange(date_from, date_to, '[]') && daterange(p_from, p_to, '[]')) then
    raise exception 'freeze_overlap' using errcode = 'P0001';
  end if;

  insert into freezes (organization_id, enrollment_id, date_from, date_to, reason_id, created_by)
  values (v_org, p_enrollment, p_from, p_to, p_reason, current_staff_id(v_org))
  returning id into v_id;
  perform refresh_enrollment_statuses(v_org);
  return v_id;
end $$;

-- Muzlatishni tugatish: boshlanmagan bo'lsa bekor qilinadi, boshlangan bo'lsa kechagi kun bilan yopiladi.
create or replace function public.end_freeze(p_freeze uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_f freezes%rowtype;
  v_e enrollments%rowtype;
  v_today date := today_tashkent();
begin
  select * into v_f from freezes where id = p_freeze;
  if v_f.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select * into v_e from enrollments where id = v_f.enrollment_id;
  perform assert_student_editor(v_e.student_id);
  if v_f.date_to < v_today then
    raise exception 'freeze_finished' using errcode = 'P0001';
  end if;
  if v_f.date_from >= v_today then
    delete from freezes where id = p_freeze;
  else
    update freezes set date_to = v_today - 1 where id = p_freeze;
  end if;
  perform refresh_enrollment_statuses(v_f.organization_id);
end $$;

-- Arxivlash: faqat ochiq a'zoligi yo'q talaba
create or replace function public.set_student_archived(p_student uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform assert_student_editor(p_student, 'students.delete');
  if p_archived and exists (select 1 from enrollments where student_id = p_student and status <> 'left') then
    raise exception 'student_has_open_enrollments' using errcode = 'P0001';
  end if;
  update students set archived_at = case when p_archived then now() end where id = p_student;
end $$;

-- Talaba tarixi: talaba, uning a'zoliklari, muzlatishlari, teglari va izohlari bo'yicha audit.
-- Talabani ko'ra oladigan har bir xodimga (audit.view shart emas).
create or replace function public.student_history(p_student uuid)
returns table (id bigint, created_at timestamptz, action text, entity text, entity_id uuid, diff jsonb, actor_name text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from students where students.id = p_student;
  if v_org is null or not can_see_student(v_org, p_student) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select a.id, a.created_at, a.action, a.entity, a.entity_id, a.diff, p.full_name
    from audit_log a
    left join profiles p on p.id = a.actor_id
   where a.organization_id = v_org
     and (
       (a.entity in ('students', 'student_tags') and a.entity_id = p_student)
       or (a.entity = 'enrollments' and (a.entity_id in (select e.id from enrollments e where e.student_id = p_student)
                                         or a.diff ->> 'student_id' = p_student::text))
       or (a.entity = 'freezes' and (a.entity_id in (select f.id from freezes f join enrollments e on e.id = f.enrollment_id
                                                      where e.student_id = p_student)
                                     or a.diff ->> 'enrollment_id' in (select e.id::text from enrollments e
                                                                       where e.student_id = p_student)))
       or (a.entity = 'student_notes' and a.diff ->> 'student_id' = p_student::text)
     )
   order by a.created_at desc, a.id desc
   limit 300;
end $$;

-- ---------- Huquqlar ----------
revoke execute on function public.today_tashkent() from public, anon;
grant execute on function public.today_tashkent() to authenticated, service_role;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.assert_student_editor(uuid, text)',
    'public.assert_enrollable_group(uuid, uuid)',
    'public.enroll_student(uuid, uuid, text, date)',
    'public.create_student(jsonb)',
    'public.activate_enrollment(uuid, date)',
    'public.leave_enrollment(uuid, date, uuid)',
    'public.transfer_enrollment(uuid, uuid, date, uuid)',
    'public.refresh_enrollment_statuses(uuid)',
    'public.freeze_enrollment(uuid, date, date, uuid)',
    'public.end_freeze(uuid)',
    'public.set_student_archived(uuid, boolean)',
    'public.student_history(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- Izohlar: muallif o'z izohini o'chira oladi (boshqa hech kim).
create policy student_notes_delete on student_notes for delete
  using (created_by = current_staff_id(organization_id));

-- =====================================================================
-- Storage: talaba rasmlari — YOPIQ bucket (shaxsiy ma'lumot), imzolangan havola bilan o'qiladi.
-- Yo'l: student-photos/<organization_id>/<student_id>/<fayl>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-photos', 'student-photos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy student_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'student-photos'
         and can_see_student(try_uuid((storage.foldername(name))[1]), try_uuid((storage.foldername(name))[2])));
create policy student_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'student-photos'
              and can_edit_student(try_uuid((storage.foldername(name))[1]), try_uuid((storage.foldername(name))[2])));
create policy student_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'student-photos'
         and can_edit_student(try_uuid((storage.foldername(name))[1]), try_uuid((storage.foldername(name))[2])));
create policy student_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'student-photos'
         and can_edit_student(try_uuid((storage.foldername(name))[1]), try_uuid((storage.foldername(name))[2])));
