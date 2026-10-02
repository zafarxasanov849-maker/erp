-- Davomat (4-bosqich).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true);
  select set_config('request.jwt.claims', '', true);
$$;
-- d(-1) — Toshkent bo'yicha kechagi kun
create function pg_temp.d(p_offset integer) returns date language sql as $$
  select today_tashkent() + p_offset
$$;
insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998901111111', now(), '{"full_name": "Aziz"}', now(), now()),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998902222222', now(), '{"full_name": "Botir"}', now(), now()),
  ('c0000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998903333333', now(), '{"full_name": "Ustoz Charos"}', now(), now());

create temp table roles_json as select '[
  {"key": "owner", "name": "Egasi", "permissions": []},
  {"key": "teacher", "name": "Ustoz", "permissions": ["dashboard.view", "groups.view", "attendance.view"]}
]'::jsonb as j;
grant select on roles_json to authenticated;

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select set_config('test.org_a', register_organization('A', 'Aziz', 'Chilonzor', (select j from roles_json))::text, false);
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select set_config('test.org_b', register_organization('B', 'Botir', 'Yunusobod', (select j from roles_json))::text, false);
select pg_temp.logout();

-- Ma'lumotlar (postgres nomidan)
insert into staff (organization_id, user_id, role_id, all_branches, is_teacher)
select current_setting('test.org_a')::uuid, 'c0000000-0000-4000-8000-00000000000c', id, true, true
  from roles where organization_id = current_setting('test.org_a')::uuid and system_key = 'teacher';
insert into courses (organization_id, name, monthly_price) values (current_setting('test.org_a')::uuid, 'Ingliz', 600000);
insert into groups (organization_id, branch_id, course_id, teacher_id, name, monthly_price, weekdays, start_time, end_time, start_date)
select current_setting('test.org_a')::uuid, b.id, c.id,
       case when n = 'G1' then (select id from staff where user_id = 'c0000000-0000-4000-8000-00000000000c') end,
       n, 600000, '{1,2,3,4,5,6,7}', '14:00', '15:30', today_tashkent() - 30
  from branches b, courses c, unnest(array['G1', 'G2']) n
 where b.organization_id = current_setting('test.org_a')::uuid and c.name = 'Ingliz';
insert into lessons (organization_id, group_id, date, start_time, end_time, status)
select g.organization_id, g.id, today_tashkent() + o, '14:00', '15:30', 'scheduled'
  from groups g, generate_series(-6, 1) o where g.name in ('G1', 'G2');
update lessons set status = 'cancelled', cancel_reason = 'Bayram'
 where date = today_tashkent() - 2 and group_id = (select id from groups where name = 'G1');
insert into students (organization_id, branch_id, full_name, phone)
select current_setting('test.org_a')::uuid, b.id, n, '+99890000000' || i
  from branches b, unnest(array['S1', 'S2', 'S3', 'S4', 'S5']) with ordinality as t(n, i)
 where b.organization_id = current_setting('test.org_a')::uuid;
insert into enrollments (organization_id, student_id, group_id, status, joined_at, activated_at)
select s.organization_id, s.id, g.id, 'active',
       case when s.full_name = 'S3' then today_tashkent() else today_tashkent() - 10 end,
       case when s.full_name = 'S3' then today_tashkent() else today_tashkent() - 10 end
  from students s, groups g where s.full_name in ('S1', 'S2', 'S3', 'S4') and g.name = 'G1';
insert into enrollments (organization_id, student_id, group_id, status, joined_at, activated_at)
select s.organization_id, s.id, g.id, 'active', today_tashkent() - 10, today_tashkent() - 10
  from students s, groups g where s.full_name = 'S5' and g.name = 'G2';
insert into freezes (organization_id, enrollment_id, date_from, date_to)
select e.organization_id, e.id, today_tashkent() - 1, today_tashkent() - 1
  from enrollments e join students s on s.id = e.student_id where s.full_name = 'S4';


-- Id'lar postgres nomidan oldindan yig'iladi (ustoz RLS orqali talabalarni ko'rmaydi)
create temp table t_lessons as
  select g.name as grp, (l.date - today_tashkent()) as off, l.id from lessons l join groups g on g.id = l.group_id
   where g.organization_id = current_setting('test.org_a')::uuid;
create temp table t_enr as
  select s.full_name as name, e.id from enrollments e join students s on s.id = e.student_id
   where e.organization_id = current_setting('test.org_a')::uuid;
grant select on t_lessons, t_enr to authenticated;
select set_config('test.g1', (select id::text from groups where name = 'G1'), false);
create function pg_temp.lesson(p_group text, p_offset integer) returns uuid language sql as $$
  select id from t_lessons where grp = p_group and off = p_offset
$$;
create function pg_temp.enr(p_student text) returns uuid language sql as $$
  select id from t_enr where name = p_student
$$;
-- marks(array['S1', 'present', 'S2', '']) — '' belgini olib tashlaydi
create function pg_temp.marks(p text[]) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('enrollment_id', pg_temp.enr(p[i]), 'status', nullif(p[i + 1], '')))
    from generate_series(1, array_length(p, 1), 2) i
$$;
grant execute on function pg_temp.lesson(text, integer), pg_temp.enr(text), pg_temp.marks(text[]) to authenticated;

-- ---------- Ustoz: bugungi dars ----------
select pg_temp.login('c0000000-0000-4000-8000-00000000000c');
select is(set_attendance(pg_temp.lesson('G1', 0), pg_temp.marks(array['S1', 'present', 'S2', 'absent'])), 2,
          'ustoz o''z guruhining bugungi darsini belgilaydi');
select is((select status::text from lessons where id = pg_temp.lesson('G1', 0)), 'held', 'belgilangan dars — O''tdi');
select is((select late_marked from attendance where enrollment_id = pg_temp.enr('S1') and lesson_id = pg_temp.lesson('G1', 0)),
          false, 'dars kuni belgilangan — late_marked yo''q');
select lives_ok($$ select set_attendance(pg_temp.lesson('G1', 0), pg_temp.marks(array['S2', 'late'])) $$,
          'dars kuni ichida o''zgartirish');
select is((select status::text || '/' || edited_after from attendance
            where enrollment_id = pg_temp.enr('S2') and lesson_id = pg_temp.lesson('G1', 0)), 'late/false',
          'dars kuni ichidagi tuzatish edited_after emas');

-- Kechagi dars (muddat ichida): late_marked; keyin o'zgartirish — edited_after + audit
select lives_ok($$ select set_attendance(pg_temp.lesson('G1', -1), pg_temp.marks(array['S1', 'absent'])) $$,
          'kechagi darsni belgilash (muddat ichida)');
select is((select late_marked from attendance where enrollment_id = pg_temp.enr('S1') and lesson_id = pg_temp.lesson('G1', -1)),
          true, 'kechikib belgilangan — late_marked');
select lives_ok($$ select set_attendance(pg_temp.lesson('G1', -1), pg_temp.marks(array['S1', 'excused'])) $$,
          'kechagi belgini o''zgartirish');
select is((select edited_after from attendance where enrollment_id = pg_temp.enr('S1') and lesson_id = pg_temp.lesson('G1', -1)),
          true, 'dars kunidan keyin o''zgartirilgan — edited_after');
select pg_temp.logout();
select is((select count(*)::int from audit_log where entity = 'attendance' and action = 'attendance.update'), 1,
          'faqat dars kunidan keyingi tahrir audit_log''da');
select pg_temp.login('c0000000-0000-4000-8000-00000000000c');

-- Cheklovlar
select throws_ok($$ select set_attendance(pg_temp.lesson('G1', -5), pg_temp.marks(array['S1', 'present'])) $$,
  'P0001', 'edit_window_closed', 'ustoz muddatdan (2 kun) keyin belgilay olmaydi');
select throws_ok($$ select set_attendance(pg_temp.lesson('G1', 1), pg_temp.marks(array['S1', 'present'])) $$,
  'P0001', 'lesson_in_future', 'kelajakdagi dars belgilanmaydi');
select throws_ok($$ select set_attendance(pg_temp.lesson('G1', -2), pg_temp.marks(array['S1', 'present'])) $$,
  'P0001', 'lesson_cancelled', 'bekor qilingan dars belgilanmaydi');
select throws_ok($$ select set_attendance(pg_temp.lesson('G1', -1), pg_temp.marks(array['S3', 'present'])) $$,
  'P0001', 'enrollment_not_in_lesson', 'guruhga keyin qo''shilgan talaba eski darsda belgilanmaydi');
select throws_ok($$ select set_attendance(pg_temp.lesson('G1', -1), pg_temp.marks(array['S4', 'present'])) $$,
  'P0001', 'enrollment_frozen', 'muzlatilgan kunda belgilanmaydi');
select throws_ok($$ select set_attendance(pg_temp.lesson('G2', 0), pg_temp.marks(array['S5', 'present'])) $$,
  '42501', 'forbidden', 'ustoz boshqa guruhni belgilay olmaydi');
select throws_ok(
  format($$ insert into attendance (organization_id, lesson_id, enrollment_id, status) values (%L, %L, %L, 'present') $$,
         current_setting('test.org_a'), pg_temp.lesson('G1', 0), pg_temp.enr('S3')),
  '42501', null, 'to''g''ridan-to''g''ri yozish taqiqlangan (faqat RPC)');

select is((select jsonb_array_length(j -> 'students') || '/' || jsonb_array_length(j -> 'marks') || '/' || (j ->> 'can_edit')
             from (select group_journal(current_setting('test.g1')::uuid, pg_temp.d(-1), pg_temp.d(0)) j) x),
          '4/3/true', 'jurnal: kechagi va bugungi a''zolar va belgilar');
select is((select members || '/' || marked from day_lessons(current_setting('test.org_a')::uuid, pg_temp.d(0)) where group_name = 'G1'),
          '4/2', 'bugungi darslar: a''zolar (muzlatilganlarsiz) va belgilanganlar');
select lives_ok($$ select set_lesson_notes(pg_temp.lesson('G1', 0), 'Present Simple', '12-mashq') $$,
          'ustoz mavzu va uy vazifasini yozadi');

-- Belgini olib tashlash → dars yana Rejada
select lives_ok($$ select set_attendance(pg_temp.lesson('G1', 0), pg_temp.marks(array['S1', '', 'S2', ''])) $$,
          'belgilarni olib tashlash');
select is((select status::text from lessons where id = pg_temp.lesson('G1', 0)), 'scheduled', 'belgisiz dars — yana Rejada');

-- ---------- Admin (egasi): muddat cheklovi yo'q; kelmayotganlar ----------
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select lives_ok($$
  select set_attendance(pg_temp.lesson('G1', o), pg_temp.marks(array['S2', s, 'S1', 'present']))
    from (values (-6, 'absent'), (-5, 'excused'), (-4, 'absent'), (-3, 'absent')) v(o, s) $$,
  'admin eski darslarni ham belgilaydi');
select is((select streak || '/' || full_name from absentees(current_setting('test.org_a')::uuid)), '3/S2',
          'ketma-ket 3 marta kelmagan (sababli o''tkazib yuboriladi)');

-- ---------- Boshqa markaz ----------
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select throws_ok($$ select set_attendance(pg_temp.lesson('G1', 0), '[]') $$,
  '42501', 'forbidden', 'B markazi A davomatini yoza olmaydi');
select throws_ok($$ select group_journal(current_setting('test.g1')::uuid, pg_temp.d(-1), pg_temp.d(0)) $$,
  '42501', 'forbidden', 'B markazi A jurnalini ko''rmaydi');
select pg_temp.logout();

-- Barcha bosqichlar: tizimga kirmagan (anon) SECURITY DEFINER funksiyani chaqira olmaydi
select is((select string_agg(p.proname, ', ' order by p.proname)
             from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')),
          null, 'anon hech bir SECURITY DEFINER funksiyani chaqira olmaydi');

select * from finish();
rollback;
