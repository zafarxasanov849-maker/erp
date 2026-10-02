-- Kurslar, xonalar, guruhlar, darslar, bayramlar (2-bosqich).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(24);

create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true);
  select set_config('request.jwt.claims', '', true);
$$;

insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998901111111', now(), '{"full_name": "Aziz"}', now(), now()),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998902222222', now(), '{"full_name": "Botir"}', now(), now()),
  ('c0000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated',
   '998903333333', now(), '{"full_name": "Charos"}', now(), now());

create temp table roles_json as select '[
  {"key": "owner", "name": "Egasi", "permissions": []},
  {"key": "admin", "name": "Admin", "permissions": ["dashboard.view", "groups.view"]}
]'::jsonb as j;
grant select on roles_json to authenticated;

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select set_config('test.org_a', register_organization('A', 'Aziz', 'Chilonzor', (select j from roles_json))::text, false);
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select set_config('test.org_b', register_organization('B', 'Botir', 'Yunusobod', (select j from roles_json))::text, false);
select pg_temp.logout();

-- Ma'lumotnomalar (postgres sifatida tayyorlaymiz)
create temp table ids as
select
  (select id from branches where organization_id = current_setting('test.org_a')::uuid) as branch_a,
  (select id from branches where organization_id = current_setting('test.org_b')::uuid) as branch_b,
  (select id from staff where user_id = 'a0000000-0000-4000-8000-00000000000a') as staff_a;
grant select on ids to authenticated;

insert into branches (organization_id, name) values (current_setting('test.org_a')::uuid, 'Sergeli');
update staff set is_teacher = true where id = (select staff_a from ids);

-- ---------- Egasi kurs, xona, guruh yaratadi ----------
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select lives_ok(
  $$ insert into courses (organization_id, name, monthly_price, lesson_minutes)
     values (current_setting('test.org_a')::uuid, 'Ingliz tili', 680000, 90) $$,
  'egasi kurs qo''shadi');
select lives_ok(
  $$ insert into rooms (organization_id, branch_id, name, capacity)
     values (current_setting('test.org_a')::uuid, (select branch_a from ids), '6-xona', 12) $$,
  'egasi xona qo''shadi');
select throws_ok(
  $$ insert into courses (organization_id, name, monthly_price) values (current_setting('test.org_a')::uuid, 'Ingliz tili', 1) $$,
  '23505', null, 'kurs nomi markazda takrorlanmaydi');
select lives_ok(
  $$ insert into groups (organization_id, branch_id, course_id, teacher_id, room_id, name, monthly_price,
                         weekdays, start_time, end_time, start_date)
     values (current_setting('test.org_a')::uuid, (select branch_a from ids),
             (select id from courses where name = 'Ingliz tili'), (select staff_a from ids),
             (select id from rooms where name = '6-xona'), '10-guruh', 680000, '{1,3,5}', '14:00', '15:30', '2026-10-01') $$,
  'egasi guruh yaratadi');
select throws_ok(
  $$ insert into groups (organization_id, branch_id, course_id, name, monthly_price, weekdays, start_time, end_time, start_date)
     values (current_setting('test.org_a')::uuid, (select branch_a from ids),
             (select id from courses where name = 'Ingliz tili'), 'Bo''sh', 1, '{}', '14:00', '15:30', '2026-10-01') $$,
  '23514', null, 'hafta kunlarisiz guruh bo''lmaydi');
select pg_temp.logout();

-- Boshqa markaz kursi (B markazida, postgres sifatida yaratamiz)
insert into courses (organization_id, name, monthly_price) values (current_setting('test.org_b')::uuid, 'B kursi', 1);
insert into rooms (organization_id, branch_id, name)
values (current_setting('test.org_a')::uuid, (select id from branches where name = 'Sergeli'), 'Sergeli-1');

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$ insert into groups (organization_id, branch_id, course_id, name, monthly_price, weekdays, start_time, end_time, start_date)
     values (current_setting('test.org_a')::uuid, (select branch_a from ids),
             (select id from courses where name = 'B kursi'), 'X', 1, '{1}', '14:00', '15:30', '2026-10-01') $$,
  'P0001', 'group_course_mismatch', 'boshqa markaz kursi bilan guruh bo''lmaydi');
select throws_ok(
  $$ insert into groups (organization_id, branch_id, course_id, room_id, name, monthly_price, weekdays, start_time, end_time, start_date)
     values (current_setting('test.org_a')::uuid, (select branch_a from ids),
             (select id from courses where name = 'Ingliz tili'), (select id from rooms where name = 'Sergeli-1'),
             'X', 1, '{1}', '14:00', '15:30', '2026-10-01') $$,
  'P0001', 'group_room_mismatch', 'boshqa filial xonasi bilan guruh bo''lmaydi');
select throws_ok(
  $$ insert into rooms (organization_id, branch_id, name)
     values (current_setting('test.org_a')::uuid, (select branch_b from ids), 'Begona') $$,
  'P0001', 'room_branch_mismatch', 'boshqa markaz filialiga xona qo''shib bo''lmaydi');

-- ---------- Darslar va bayram ----------
select lives_ok(
  $$ insert into lessons (organization_id, group_id, date, start_time, end_time)
     select current_setting('test.org_a')::uuid, g.id, d::date, '14:00', '15:30'
       from groups g, unnest(array['2026-10-12', '2026-10-14', '2026-10-16']) d where g.name = '10-guruh' $$,
  'darslar yaratiladi');
select lives_ok(
  $$ insert into holidays (organization_id, date, reason) values (current_setting('test.org_a')::uuid, '2026-10-14', 'Bayram') $$,
  'bayram qo''shiladi');
select throws_ok(
  $$ insert into holidays (organization_id, date, reason) values (current_setting('test.org_a')::uuid, '2026-10-14', 'Yana') $$,
  '23505', null, 'bir kunga bitta bayram');
update lessons set status = 'cancelled', cancel_reason = 'Bayram',
       cancel_holiday_id = (select id from holidays where date = '2026-10-14')
 where date = '2026-10-14';
select pg_temp.logout();

select throws_ok(
  format($$ insert into lessons (organization_id, group_id, date, start_time, end_time)
            select %L, id, '2026-10-19', '14:00', '15:30' from groups where name = '10-guruh' $$,
         current_setting('test.org_b')),
  'P0001', 'lesson_group_mismatch', 'dars guruh markazidan boshqa markazda bo''lmaydi');


-- ---------- apply_lesson_plan / apply_holiday / remove_holiday ----------
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select lives_ok(
  $$ select apply_lesson_plan((select id from groups where name = '10-guruh'),
       '[{"date": "2026-11-02", "startTime": "14:00", "endTime": "15:30", "status": "scheduled"},
         {"date": "2026-11-04", "startTime": "14:00", "endTime": "15:30", "status": "scheduled"},
         {"date": "2026-11-06", "startTime": "14:00", "endTime": "15:30", "status": "scheduled"}]'::jsonb,
       '{}', '[]'::jsonb) $$,
  'apply_lesson_plan darslarni qo''shadi');
select pg_temp.logout();
update lessons set status = 'held' where date = '2026-11-02';

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select apply_lesson_plan((select id from groups where name = '10-guruh'), '[]'::jsonb,
  array(select id from lessons where date in ('2026-11-02', '2026-11-06')), '[]'::jsonb);
select is((select array_agg(date::text order by date) from lessons where date >= '2026-11-01'),
          array['2026-11-02', '2026-11-04'], 'o''tgan (held) dars olib tashlanmaydi, rejali olib tashlanadi');

insert into holidays (organization_id, date, reason) values (current_setting('test.org_a')::uuid, '2026-11-04', 'Bayram 2');
select is((select count(*)::int from apply_holiday((select id from holidays where date = '2026-11-04'))), 1,
          'apply_holiday bitta darsni bekor qiladi');
select is((select status::text || '/' || cancel_reason from lessons where date = '2026-11-04'), 'cancelled/Bayram 2',
          'dars bayram sababi bilan bekor');
select is((select count(*)::int from apply_holiday((select id from holidays where date = '2026-11-04'))), 0,
          'qayta qo''llash hech narsani o''zgartirmaydi');
select is((select count(*)::int from remove_holiday((select id from holidays where date = '2026-11-04'))), 1,
          'remove_holiday darsni tiklaydi');
select is((select status::text from lessons where date = '2026-11-04'), 'scheduled', 'dars yana rejada');
select pg_temp.logout();

-- Ruxsatsiz xodim (admin roli: faqat groups.view)
insert into staff (organization_id, user_id, role_id, all_branches)
select current_setting('test.org_a')::uuid, 'c0000000-0000-4000-8000-00000000000c', id, true
  from roles where organization_id = current_setting('test.org_a')::uuid and system_key = 'admin';
insert into holidays (organization_id, date, reason) values (current_setting('test.org_a')::uuid, '2026-11-09', 'Bayram 3');
select pg_temp.login('c0000000-0000-4000-8000-00000000000c');
select throws_ok(
  $$ select apply_holiday((select id from holidays where date = '2026-11-09')) $$,
  '42501', 'forbidden', 'settings.catalogs ruxsatisiz bayramni qo''llab bo''lmaydi');
select pg_temp.logout();

-- B markazi A ning darslari va bayramlarini ko'rmaydi
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from lessons) + (select count(*)::int from holidays where organization_id = current_setting('test.org_a')::uuid),
          0, 'B markazi A darslari va bayramlarini ko''rmaydi');
select pg_temp.logout();

delete from holidays where date = '2026-10-14' and organization_id = current_setting('test.org_a')::uuid;
select is((select cancel_holiday_id from lessons
            where date = '2026-10-14' and organization_id = current_setting('test.org_a')::uuid), null,
          'bayram o''chirilsa bog''lanish uziladi (on delete set null)');

select ok(exists (select 1 from audit_log where action = 'groups.insert' and organization_id = current_setting('test.org_a')::uuid),
          'audit: guruh yaratilgani yozildi');

-- Audit yozuvi bor (guruhi yo'q) foydalanuvchini o'chirish xato bermaydi
delete from auth.users where id = 'b0000000-0000-4000-8000-00000000000b';
select ok(exists (select 1 from audit_log where actor_id is null and organization_id = current_setting('test.org_b')::uuid),
          'foydalanuvchi o''chirilganda audit yozuvlari muallifsiz qoladi');

select * from finish();
rollback;
