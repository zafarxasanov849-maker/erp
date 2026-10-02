-- Talabalar va a'zoliklar (3-bosqich).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true);
  select set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.enr(p_group text) returns uuid language sql as $$
  select e.id from enrollments e join groups g on g.id = e.group_id
   where g.name = p_group order by e.created_at desc limit 1
$$;
grant execute on function pg_temp.enr(text) to authenticated;

insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998901111111', now(), '{"full_name": "Aziz"}', now(), now()),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998902222222', now(), '{"full_name": "Botir"}', now(), now()),
  ('c0000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998903333333', now(), '{"full_name": "Charos"}', now(), now());

create temp table roles_json as select '[
  {"key": "owner", "name": "Egasi", "permissions": []},
  {"key": "admin", "name": "Admin", "permissions": ["students.view", "students.create", "students.update"]}
]'::jsonb as j;
grant select on roles_json to authenticated;

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select set_config('test.org_a', register_organization('A', 'Aziz', 'Chilonzor', (select j from roles_json))::text, false);
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select set_config('test.org_b', register_organization('B', 'Botir', 'Yunusobod', (select j from roles_json))::text, false);
select pg_temp.logout();

create temp table ids as select
  (select id from branches where organization_id = current_setting('test.org_a')::uuid) as branch_a,
  (select id from branches where organization_id = current_setting('test.org_b')::uuid) as branch_b;
grant select on ids to authenticated;

insert into courses (organization_id, name, monthly_price) values
  (current_setting('test.org_a')::uuid, 'Ingliz', 680000),
  (current_setting('test.org_b')::uuid, 'B kurs', 1);
insert into groups (organization_id, branch_id, course_id, name, monthly_price, weekdays, start_time, end_time, start_date)
select current_setting('test.org_a')::uuid, (select branch_a from ids), c.id, n, 680000, '{1,3,5}', '14:00', '15:30', '2026-09-01'
  from courses c, unnest(array['G1', 'G2', 'G3']) n where c.name = 'Ingliz';
insert into groups (organization_id, branch_id, course_id, name, monthly_price, weekdays, start_time, end_time, start_date)
select current_setting('test.org_b')::uuid, (select branch_b from ids), id, 'GB', 1, '{1}', '10:00', '11:00', '2026-09-01'
  from courses where name = 'B kurs';
insert into staff (organization_id, user_id, role_id, all_branches)
select current_setting('test.org_a')::uuid, 'c0000000-0000-4000-8000-00000000000c', id, true
  from roles where organization_id = current_setting('test.org_a')::uuid and system_key = 'admin';

-- ---------- create_student ----------
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select set_config('test.student', (create_student(jsonb_build_object(
  'branch_id', (select branch_a from ids), 'full_name', 'Mohira Eshmatova', 'phone', '+998901234567',
  'joined_at', '2026-09-10',
  'enrollments', jsonb_build_array(
    jsonb_build_object('group_id', (select id from groups where name = 'G1'), 'status', 'trial', 'date', '2026-09-10'),
    jsonb_build_object('group_id', (select id from groups where name = 'G2'), 'status', 'active', 'date', '2026-09-10')))
) ->> 'student_id'), false);

select is((select count(*)::int from enrollments where student_id = current_setting('test.student')::uuid), 2,
          'create_student: talaba va 2 ta a''zolik');
select is((select activated_at::text from enrollments where id = pg_temp.enr('G2')), '2026-09-10',
          'faol a''zolikda activated_at to''ladi');
select is((select status from students_overview where id = current_setting('test.student')::uuid), 'active',
          'overview: kamida bitta faol → active');
select is((select cardinality(group_ids) from students_overview where id = current_setting('test.student')::uuid), 2,
          'overview: 2 ta guruh');

select throws_ok(
  format($$ select enroll_student(%L, (select id from groups where name = 'G1'), 'trial', '2026-09-11') $$,
         current_setting('test.student')),
  'P0001', 'already_enrolled', 'bir guruhga ikkinchi ochiq a''zolik bo''lmaydi');
select pg_temp.logout();
select set_config('test.gb', (select id::text from groups where name = 'GB'), false);
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select throws_ok(
  format($$ select enroll_student(%L, %L, 'trial', '2026-09-11') $$, current_setting('test.student'), current_setting('test.gb')),
  'P0001', 'enrollment_group_mismatch', 'boshqa markaz guruhiga yozib bo''lmaydi');

-- ---------- activate ----------
select throws_ok($$ select activate_enrollment(pg_temp.enr('G1'), '2026-09-01') $$,
  'P0001', 'date_before_join', 'a''zolikdan oldingi sana bilan faollashtirib bo''lmaydi');
select lives_ok($$ select activate_enrollment(pg_temp.enr('G1'), '2026-09-15') $$, 'sinovdan faollashtirish');
select is((select status::text || ' ' || activated_at from enrollments where id = pg_temp.enr('G1')), 'active 2026-09-15',
          'holat va sana');
select throws_ok($$ select activate_enrollment(pg_temp.enr('G1'), '2026-09-16') $$,
  'P0001', 'invalid_status', 'faol a''zolikni qayta faollashtirib bo''lmaydi');

-- ---------- freeze ----------
select lives_ok($$ select freeze_enrollment(pg_temp.enr('G1'), today_tashkent(), today_tashkent() + 5, null) $$,
  'bugundan muzlatish');
select is((select status::text from enrollments where id = pg_temp.enr('G1')), 'frozen', 'muzlatilgan holat');
select is((select status from students_overview where id = current_setting('test.student')::uuid), 'active',
          'boshqa faol guruh bor — talaba baribir faol');
select throws_ok($$ select freeze_enrollment(pg_temp.enr('G1'), today_tashkent() + 3, today_tashkent() + 7, null) $$,
  'P0001', 'freeze_overlap', 'kesishgan muzlatish bo''lmaydi');
select lives_ok($$ select end_freeze((select id from freezes where enrollment_id = pg_temp.enr('G1'))) $$,
  'boshlangan kundagi muzlatishni tugatish (bekor qilish)');
select is((select status::text from enrollments where id = pg_temp.enr('G1')), 'active', 'yana faol');
select lives_ok($$ select freeze_enrollment(pg_temp.enr('G1'), today_tashkent() + 10, today_tashkent() + 20, null) $$,
  'kelajakdagi muzlatish');
select is((select status::text from enrollments where id = pg_temp.enr('G1')), 'active',
          'kelajakdagi muzlatishda hozircha faol');

-- ---------- leave ----------
select throws_ok($$ select leave_enrollment(pg_temp.enr('G2'), today_tashkent(), null) $$,
  'P0001', 'reason_required', 'chiqarish sababsiz bo''lmaydi');
select lives_ok(
  $$ select leave_enrollment(pg_temp.enr('G2'), today_tashkent(),
       (select id from reasons where kind = 'leave' and organization_id = current_setting('test.org_a')::uuid limit 1)) $$,
  'sabab bilan chiqarish');
select is((select status::text from enrollments where id = pg_temp.enr('G2')), 'left', 'chiqqan');

-- ---------- transfer ----------
select set_config('test.new_enr', transfer_enrollment(pg_temp.enr('G1'), (select id from groups where name = 'G3'),
                                                      today_tashkent() + 1, null)::text, false);
select is((select status::text || ' ' || (left_at = today_tashkent())::text
             from enrollments e join groups g on g.id = e.group_id where g.name = 'G1'),
          'left true', 'o''tkazishda eski a''zolik kechagi kun bilan chiqqan');
select is((select status::text from enrollments where id = current_setting('test.new_enr')::uuid), 'active',
          'yangi guruhda faol');

-- ---------- archive ----------
select throws_ok(format($$ select set_student_archived(%L, true) $$, current_setting('test.student')),
  'P0001', 'student_has_open_enrollments', 'ochiq a''zoligi bor talabani arxivlab bo''lmaydi');

select ok((select count(*) from student_history(current_setting('test.student')::uuid)
            where action in ('enrollments.insert', 'enrollments.update', 'freezes.insert')) >= 6,
          'tarixda a''zolik va muzlatish o''zgarishlari bor');
select pg_temp.logout();

-- ---------- Ruxsatlar ----------
select pg_temp.login('c0000000-0000-4000-8000-00000000000c');
select throws_ok(format($$ select set_student_archived(%L, false) $$, current_setting('test.student')),
  '42501', 'forbidden', 'students.delete ruxsatisiz arxivlash yo''q');
select ok((select count(*) from student_history(current_setting('test.student')::uuid)) > 0,
          'admin (audit.view yo''q) talaba tarixini ko''radi');

select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from students_overview where organization_id = current_setting('test.org_a')::uuid), 0,
          'B markazi A talabalarini ko''rmaydi');
select throws_ok(format($$ select student_history(%L) $$, current_setting('test.student')),
  '42501', 'forbidden', 'B markazi A talabasi tarixini ko''rmaydi');
select throws_ok(
  format($$ select create_student(jsonb_build_object('branch_id', %L, 'full_name', 'X', 'phone', '+998900000000')) $$,
         (select branch_a from ids)),
  '42501', 'forbidden', 'B markazi A filialiga talaba qo''sha olmaydi');
select pg_temp.logout();

select * from finish();
rollback;
