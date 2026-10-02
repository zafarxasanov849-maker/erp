-- 4-bosqich: davomat jurnali.
-- Barcha yozuvlar SECURITY DEFINER RPC orqali (ruxsat, ustoz muddati, late_marked/edited_after shu yerda).
-- Ustozda students.view yo'q, shuning uchun jurnal ma'lumotlari ham RPC orqali (faqat ism, telefonsiz).

-- Har funksiyadan keyin darhol revoke/grant: Supabase yangi funksiyani anon uchun ham ochadi,
-- SQL qismlarga bo'lib qo'llanganda ham oraliq bo'lmasin.

-- Markaz sozlamasidan butun son (organizations.settings)
create or replace function public.org_setting_int(p_org uuid, p_key text, p_default integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select (settings ->> p_key)::integer from organizations where id = p_org), p_default)
$$;
revoke execute on function public.org_setting_int(uuid, text, integer) from public, anon;
grant execute on function public.org_setting_int(uuid, text, integer) to authenticated, service_role;

-- To'g'ridan-to'g'ri yozish taqiqlanadi (attendance_rw muddat va bayroqlarni chetlab o'tardi).
-- O'qish: attendance_read (attendance.view + guruhni ko'rish) qoladi.
drop policy if exists attendance_rw on attendance;
revoke insert, update, delete on attendance from anon, authenticated;

create index if not exists attendance_enrollment_idx on attendance (enrollment_id);

-- Dars kunidan keyingi tahrir/o'chirish audit_log'ga (dars kuni ichidagi tuzatishlar — yo'q).
-- set_attendance() o'tgan dars uchun app.attendance_audit = 'on' qo'yadi.
create trigger audit_attendance after update or delete on attendance
  for each row
  when (current_setting('app.attendance_audit', true) = 'on')
  execute function public.audit_row();

-- ---------------------------------------------------------------------
-- Ruxsat: admin (attendance.manage + filial) cheklovsiz; guruh ustozi — o'z guruhi va muddat ichida.
-- Qaytaradi: tahrirlash mumkin bo'lgan oxirgi sana (null — cheklovsiz).
-- ---------------------------------------------------------------------
create or replace function public.attendance_edit_until(p_org uuid, p_group uuid, p_lesson_date date)
returns date language plpgsql stable security definer set search_path = public as $$
declare
  v_branch uuid;
  v_teacher uuid;
begin
  select branch_id, teacher_id into v_branch, v_teacher from groups where id = p_group and organization_id = p_org;
  if v_branch is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is null
     or (has_permission(p_org, 'attendance.manage') and can_see_branch(p_org, v_branch)) then
    return null;
  end if;
  if v_teacher is not null and v_teacher = current_staff_id(p_org) then
    return p_lesson_date + org_setting_int(p_org, 'teacher_edit_days', 2);
  end if;
  raise exception 'forbidden' using errcode = '42501';
end $$;
revoke execute on function public.attendance_edit_until(uuid, uuid, date) from public, anon;
grant execute on function public.attendance_edit_until(uuid, uuid, date) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Davomatni saqlash: p_marks = [{ "enrollment_id": uuid, "status": "present|late|absent|excused" | null }]
-- null — belgini olib tashlash.
-- ---------------------------------------------------------------------
create or replace function public.set_attendance(p_lesson uuid, p_marks jsonb)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_l lessons%rowtype;
  v_today date := today_tashkent();
  v_until date;
  v_staff uuid;
  v_m jsonb;
  v_enr uuid;
  v_status text;
  v_count integer := 0;
begin
  select * into v_l from lessons where id = p_lesson;
  if v_l.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_until := attendance_edit_until(v_l.organization_id, v_l.group_id, v_l.date);
  if v_l.status = 'cancelled' then
    raise exception 'lesson_cancelled' using errcode = 'P0001';
  end if;
  if v_l.date > v_today then
    raise exception 'lesson_in_future' using errcode = 'P0001';
  end if;
  if v_until is not null and v_today > v_until then
    raise exception 'edit_window_closed' using errcode = 'P0001';
  end if;
  v_staff := current_staff_id(v_l.organization_id);
  perform set_config('app.attendance_audit', case when v_l.date < v_today then 'on' else 'off' end, true);

  for v_m in select * from jsonb_array_elements(coalesce(p_marks, '[]')) loop
    v_enr := (v_m ->> 'enrollment_id')::uuid;
    v_status := v_m ->> 'status';
    -- A'zolik shu guruhda va dars kuni a'zo (qo'shilgan..chiqqan, chegaralar bilan)
    if not exists (
      select 1 from enrollments e
       where e.id = v_enr and e.group_id = v_l.group_id
         and e.joined_at <= v_l.date and (e.left_at is null or e.left_at >= v_l.date)) then
      raise exception 'enrollment_not_in_lesson' using errcode = 'P0001';
    end if;
    if exists (select 1 from freezes f where f.enrollment_id = v_enr
                and v_l.date between f.date_from and f.date_to) then
      raise exception 'enrollment_frozen' using errcode = 'P0001';
    end if;

    if v_status is null then
      delete from attendance where lesson_id = p_lesson and enrollment_id = v_enr;
    elsif v_status in ('present', 'late', 'absent', 'excused') then
      insert into attendance (organization_id, lesson_id, enrollment_id, status, marked_by, marked_at, late_marked)
      values (v_l.organization_id, p_lesson, v_enr, v_status::attendance_status, v_staff, now(), v_l.date < v_today)
      on conflict (lesson_id, enrollment_id) do update
        set status = excluded.status,
            marked_by = excluded.marked_by,
            marked_at = excluded.marked_at,
            late_marked = attendance.late_marked or excluded.late_marked,
            edited_after = attendance.edited_after or v_l.date < v_today
      where attendance.status is distinct from excluded.status;
    else
      raise exception 'invalid_input' using errcode = '22023';
    end if;
    v_count := v_count + 1;
  end loop;
  perform set_config('app.attendance_audit', 'off', true);

  -- Belgi bor dars — "O'tdi", hammasi olib tashlansa — yana "Rejada"
  update lessons set status = case
      when exists (select 1 from attendance a where a.lesson_id = p_lesson) then 'held'::lesson_status
      else 'scheduled'::lesson_status end
   where id = p_lesson and status <> 'cancelled';
  return v_count;
end $$;
revoke execute on function public.set_attendance(uuid, jsonb) from public, anon;
grant execute on function public.set_attendance(uuid, jsonb) to authenticated, service_role;

-- Dars mavzusi va uy vazifasi (ustozda lessons'ga yozish huquqi yo'q — faqat shu ikki maydon)
create or replace function public.set_lesson_notes(p_lesson uuid, p_topic text, p_homework text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_l lessons%rowtype;
  v_until date;
begin
  select * into v_l from lessons where id = p_lesson;
  if v_l.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_until := attendance_edit_until(v_l.organization_id, v_l.group_id, v_l.date);
  if v_until is not null and today_tashkent() > v_until then
    raise exception 'edit_window_closed' using errcode = 'P0001';
  end if;
  update lessons
     set topic = nullif(btrim(left(p_topic, 500)), ''),
         homework = nullif(btrim(left(p_homework, 2000)), '')
   where id = p_lesson;
end $$;
revoke execute on function public.set_lesson_notes(uuid, text, text) from public, anon;
grant execute on function public.set_lesson_notes(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Jurnal: guruhning [p_from, p_to] oralig'idagi darslari, a'zolari va belgilari.
-- ---------------------------------------------------------------------
create or replace function public.group_journal(p_group uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_org uuid;
  v_teacher uuid;
  v_manage boolean;
begin
  select organization_id, teacher_id into v_org, v_teacher from groups where id = p_group;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if auth.uid() is not null and not (
       can_see_group(v_org, p_group)
       and (has_permission(v_org, 'attendance.view') or has_permission(v_org, 'attendance.manage')
            or v_teacher = current_staff_id(v_org))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_manage := auth.uid() is null or (has_permission(v_org, 'attendance.manage')
              and can_see_branch(v_org, (select branch_id from groups where id = p_group)));

  return jsonb_build_object(
    'today', today_tashkent(),
    'can_edit', v_manage or coalesce(v_teacher = current_staff_id(v_org), false),
    'edit_days', case when v_manage then null else org_setting_int(v_org, 'teacher_edit_days', 2) end,
    'lessons', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'date', l.date, 'start_time', to_char(l.start_time, 'HH24:MI'),
               'end_time', to_char(l.end_time, 'HH24:MI'), 'status', l.status,
               'cancel_reason', l.cancel_reason, 'topic', l.topic, 'homework', l.homework)
             order by l.date, l.start_time)
        from lessons l
       where l.group_id = p_group and l.date between p_from and p_to), '[]'),
    'students', coalesce((
      select jsonb_agg(jsonb_build_object(
               'enrollment_id', e.id, 'student_id', s.id, 'full_name', s.full_name, 'status', e.status,
               'joined_at', e.joined_at, 'left_at', e.left_at,
               'freezes', coalesce((select jsonb_agg(jsonb_build_array(f.date_from, f.date_to))
                                      from freezes f where f.enrollment_id = e.id
                                       and f.date_from <= p_to and f.date_to >= p_from), '[]'))
             order by s.full_name, e.joined_at)
        from enrollments e join students s on s.id = e.student_id
       where e.group_id = p_group
         and e.joined_at <= p_to and (e.left_at is null or e.left_at >= p_from)), '[]'),
    'marks', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lesson_id', a.lesson_id, 'enrollment_id', a.enrollment_id, 'status', a.status,
               'late_marked', a.late_marked, 'edited_after', a.edited_after))
        from attendance a join lessons l on l.id = a.lesson_id
       where l.group_id = p_group and l.date between p_from and p_to), '[]')
  );
end $$;
revoke execute on function public.group_journal(uuid, date, date) from public, anon;
grant execute on function public.group_journal(uuid, date, date) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Kun darslari (Bugungi darslar sahifasi): foydalanuvchi ko'ra oladigan guruhlar.
-- members — o'sha kuni a'zo va muzlatilmaganlar; marked — belgilanganlar.
-- ---------------------------------------------------------------------
create or replace function public.day_lessons(p_org uuid, p_date date, p_branch uuid default null)
returns table (lesson_id uuid, group_id uuid, group_name text, branch_id uuid, start_time text, end_time text,
               status lesson_status, cancel_reason text, room_name text, teacher_name text, topic text,
               members integer, marked integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_member(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select l.id, g.id, g.name, g.branch_id, to_char(l.start_time, 'HH24:MI'), to_char(l.end_time, 'HH24:MI'),
         l.status, l.cancel_reason, r.name, p.full_name, l.topic,
         (select count(*)::integer from enrollments e
           where e.group_id = g.id and e.joined_at <= l.date and (e.left_at is null or e.left_at >= l.date)
             and not exists (select 1 from freezes f where f.enrollment_id = e.id
                              and l.date between f.date_from and f.date_to)),
         (select count(*)::integer from attendance a where a.lesson_id = l.id)
    from lessons l
    join groups g on g.id = l.group_id
    left join rooms r on r.id = g.room_id
    left join staff st on st.id = g.teacher_id
    left join profiles p on p.id = st.user_id
   where l.organization_id = p_org and l.date = p_date
     and (p_branch is null or g.branch_id = p_branch)
     and (auth.uid() is null or can_see_group(p_org, g.id))
   order by l.start_time, g.name;
end $$;
revoke execute on function public.day_lessons(uuid, date, uuid) from public, anon;
grant execute on function public.day_lessons(uuid, date, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Kelmayotganlar: ketma-ket "Kelmadi" soni (oxirgi belgilardan boshlab).
-- Keldi/Kechikdi — hisob to'xtaydi; Sababli va belgilanmagan darslar — o'tkazib yuboriladi.
-- Ichki view (to'g'ridan-to'g'ri o'qib bo'lmaydi) — absentees() orqali.
-- ---------------------------------------------------------------------
create view public.enrollment_absence_streaks with (security_invoker = true) as
with marks as (
  select a.enrollment_id, a.status, l.date,
         row_number() over (partition by a.enrollment_id order by l.date desc, l.start_time desc) as rn
    from attendance a join lessons l on l.id = a.lesson_id
   where a.status <> 'excused'
),
stops as (
  select enrollment_id, min(rn) filter (where status in ('present', 'late')) as stop
    from marks group by enrollment_id
)
select m.enrollment_id, count(*)::integer as streak, max(m.date) as last_absent
  from marks m join stops s using (enrollment_id)
 where m.status = 'absent' and (s.stop is null or m.rn < s.stop)
 group by m.enrollment_id;
revoke all on public.enrollment_absence_streaks from anon, authenticated;

create or replace function public.absentees(p_org uuid, p_branch uuid default null)
returns table (enrollment_id uuid, student_id uuid, full_name text, phone text, parent_phone text,
               group_id uuid, group_name text, streak integer, last_absent date)
language plpgsql stable security definer set search_path = public as $$
declare
  v_threshold integer := org_setting_int(p_org, 'absence_threshold', 3);
  v_phones boolean;
begin
  if auth.uid() is not null and not is_member(p_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_phones := auth.uid() is null or has_permission(p_org, 'students.view');
  return query
  select e.id, s.id, s.full_name,
         case when v_phones then s.phone end, case when v_phones then s.parent_phone end,
         g.id, g.name, x.streak, x.last_absent
    from enrollment_absence_streaks x
    join enrollments e on e.id = x.enrollment_id
    join students s on s.id = e.student_id
    join groups g on g.id = e.group_id
   where e.organization_id = p_org and e.status in ('trial', 'active')
     and x.streak >= v_threshold
     and (p_branch is null or g.branch_id = p_branch)
     and (auth.uid() is null or (can_see_group(p_org, g.id)
          and (has_permission(p_org, 'attendance.view') or has_permission(p_org, 'attendance.manage')
               or g.teacher_id = current_staff_id(p_org))))
   order by x.streak desc, x.last_absent desc, s.full_name;
end $$;
revoke execute on function public.absentees(uuid, uuid) from public, anon;
grant execute on function public.absentees(uuid, uuid) to authenticated, service_role;
