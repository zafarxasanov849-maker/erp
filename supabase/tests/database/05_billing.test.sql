-- Hisob-kitob va to'lovlar (5-bosqich).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(21);

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
  ('c0000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998903333333', now(), '{"full_name": "Admin Charos"}', now(), now());

create temp table roles_json as select '[
  {"key": "owner", "name": "Egasi", "permissions": []},
  {"key": "admin", "name": "Admin", "permissions": ["students.view", "students.create", "students.update",
                                                     "payments.view", "payments.create"]}
]'::jsonb as j;
grant select on roles_json to authenticated;

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select set_config('test.org_a', register_organization('A', 'Aziz', 'Chilonzor', (select j from roles_json))::text, false);
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select set_config('test.org_b', register_organization('B', 'Botir', 'Yunusobod', (select j from roles_json))::text, false);
select pg_temp.logout();

insert into staff (organization_id, user_id, role_id, all_branches)
select current_setting('test.org_a')::uuid, 'c0000000-0000-4000-8000-00000000000c', id, true
  from roles where organization_id = current_setting('test.org_a')::uuid and system_key = 'admin';
insert into courses (organization_id, name, monthly_price) values (current_setting('test.org_a')::uuid, 'Ingliz', 680000);
insert into groups (organization_id, branch_id, course_id, name, monthly_price, weekdays, start_time, end_time, start_date)
select current_setting('test.org_a')::uuid, b.id, c.id, n, 680000, '{1,3,5}', '14:00', '15:30', today_tashkent() - 60
  from branches b, courses c, unnest(array['G1', 'G2', 'G3']) n
 where b.organization_id = current_setting('test.org_a')::uuid and c.name = 'Ingliz';
insert into students (organization_id, branch_id, full_name, phone)
select current_setting('test.org_a')::uuid, b.id, n, '+99890000000' || i
  from branches b, unnest(array['S1', 'S2']) with ordinality as t(n, i)
 where b.organization_id = current_setting('test.org_a')::uuid;
insert into enrollments (organization_id, student_id, group_id, status, joined_at, activated_at)
select s.organization_id, s.id, g.id, 'active', today_tashkent() - 40, today_tashkent() - 40
  from students s, groups g where s.full_name = 'S1' and g.name in ('G1', 'G2');
-- S2: sinovda, guruhda 2 ta o'tgan dars bor → sinov muddati o'tgan
insert into enrollments (organization_id, student_id, group_id, status, joined_at)
select s.organization_id, s.id, g.id, 'trial', today_tashkent() - 5
  from students s, groups g where s.full_name = 'S2' and g.name = 'G3';
insert into lessons (organization_id, group_id, date, start_time, end_time, status)
select g.organization_id, g.id, today_tashkent() - o, '14:00', '15:30', 'held'
  from groups g, unnest(array[1, 3]) o where g.name = 'G3';

create temp table ids as select
  (select id from students where full_name = 'S1') as s1,
  (select id from students where full_name = 'S2') as s2,
  (select e.id from enrollments e join groups g on g.id = e.group_id where g.name = 'G1') as e1,
  (select e.id from enrollments e join groups g on g.id = e.group_id where g.name = 'G2') as e2,
  (select e.id from enrollments e join groups g on g.id = e.group_id where g.name = 'G3') as e3,
  (select id from payment_methods where organization_id = current_setting('test.org_a')::uuid and name = 'Naqd') as cash;
grant select on ids to authenticated;

-- Dvigatel yozadigan yechishlar (postgres nomidan): o'tgan oy va joriy oy
insert into transactions (organization_id, branch_id, student_id, enrollment_id, kind, amount, billing, occurred_on,
                          idempotency_key)
select current_setting('test.org_a')::uuid, s.branch_id, s.id, e, 'charge', -680000,
       jsonb_build_object('month', to_char(m, 'YYYY-MM')), m, 'charge:' || e || ':' || to_char(m, 'YYYY-MM')
  from students s, (select e1 as e from ids union all select e2 from ids) en,
       (values (date_trunc('month', today_tashkent())::date - 1), (date_trunc('month', today_tashkent())::date)) mm(m)
 where s.full_name = 'S1';

-- ---------- To'lov (admin) ----------
select pg_temp.login('c0000000-0000-4000-8000-00000000000c');
select is((receive_payment((select s1 from ids), (select cash from ids), today_tashkent(), 'Oktyabr',
           jsonb_build_array(jsonb_build_object('enrollment_id', (select e1 from ids), 'amount', 500000),
                             jsonb_build_object('enrollment_id', null, 'amount', 100000)), 'k1') ->> 'receipt_no'),
          '1', 'to''lov qabul qilindi, chek raqami 1');
select is((select count(*)::int from transactions where kind = 'payment' and student_id = (select s1 from ids)), 2,
          'to''lov ikki qismga bo''lingan');
select is((receive_payment((select s1 from ids), (select cash from ids), today_tashkent(), null,
           jsonb_build_array(jsonb_build_object('enrollment_id', null, 'amount', 600000)), 'k1') ->> 'receipt_no'),
          '1', 'takror yuborilgan so''rov — o''sha to''lov');
select is((select count(*)::int from transactions where kind = 'payment'), 2, 'takrorda yangi yozuv yo''q');
select is((receive_payment((select s1 from ids), (select cash from ids), today_tashkent() - 1, null,
           jsonb_build_array(jsonb_build_object('enrollment_id', (select e2 from ids), 'amount', 300000)), 'k2') ->> 'receipt_no'),
          '2', 'keyingi chek raqami 2');
select throws_ok(
  $$ select receive_payment((select s1 from ids), (select cash from ids), today_tashkent() + 1, null,
                            '[{"enrollment_id": null, "amount": 1000}]', 'k3') $$,
  'P0001', 'payment_date_invalid', 'kelajak sana bilan to''lov yo''q');
select throws_ok(
  $$ select receive_payment((select s1 from ids), (select cash from ids), today_tashkent(), null,
                            jsonb_build_array(jsonb_build_object('enrollment_id', (select e3 from ids), 'amount', 1000)), 'k4') $$,
  'P0001', 'tx_enrollment_mismatch', 'boshqa talabaning a''zoligiga to''lov yo''q');
select throws_ok(
  $$ select receive_payment((select s1 from ids), (select cash from ids), today_tashkent(), null,
                            '[{"enrollment_id": null, "amount": 0}]', 'k5') $$,
  '22023', null, 'nol summa yo''q');
select throws_ok(
  format($$ insert into transactions (organization_id, branch_id, student_id, kind, amount)
            select %L, branch_id, id, 'adjustment', 999999 from students where full_name = 'S1' $$,
         current_setting('test.org_a')),
  '42501', null, 'to''g''ridan-to''g''ri yozish taqiqlangan');
select throws_ok($$ update transactions set amount = 1 where kind = 'payment' $$,
  '42501', null, 'tranzaksiyani o''zgartirib bo''lmaydi');
select throws_ok($$ select void_payment((select payment_ref from transactions where receipt_no = 1 limit 1), 'xato') $$,
  '42501', 'forbidden', 'payments.void ruxsatisiz bekor qilib bo''lmaydi');

-- Balans: 2 oy × 2 guruh × 680 000 = −2 720 000 + 900 000 = −1 820 000
select is((select balance from student_balances where student_id = (select s1 from ids)), -1820000::bigint,
          'balans tranzaksiyalar yig''indisi');
select is((select old_debt from student_balances where student_id = (select s1 from ids)), -460000::bigint,
          'eski qarz — joriy oy yechishlarisiz');
select is((select balance || '/' || old_debt from students_overview where id = (select s1 from ids)),
          '-1820000/-460000', 'ro''yxatda ham xuddi shu balans');
select is((select trial_expired from students_overview where id = (select s2 from ids)), true,
          '2 ta o''tgan sinov darsi — sinov muddati o''tgan');

-- ---------- Bekor qilish (egasi) ----------
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select throws_ok($$ select void_payment((select payment_ref from transactions where receipt_no = 1 limit 1), '  ') $$,
  'P0001', 'reason_required', 'sababsiz bekor qilinmaydi');
select is(void_payment((select payment_ref from transactions where receipt_no = 1 limit 1), 'Xato summa'), 2,
          'bekor qilish — har qism uchun teskari yozuv');
select is((select balance from student_balances where student_id = (select s1 from ids)), -2420000::bigint,
          'bekor qilingan to''lov balansdan chiqdi');
select throws_ok($$ select void_payment((select payment_ref from transactions where receipt_no = 1 limit 1), 'yana') $$,
  'P0001', 'already_voided', 'ikki marta bekor qilinmaydi');

-- ---------- Chegirma ----------
select throws_ok(
  format($$ insert into discounts (organization_id, enrollment_id, percent, valid_from, valid_to)
            values (%L, %L, 10, today_tashkent(), today_tashkent() + 30),
                   (%L, %L, 20, today_tashkent() + 10, null) $$,
         current_setting('test.org_a'), (select e1 from ids), current_setting('test.org_a'), (select e1 from ids)),
  'P0001', 'discount_overlap', 'bir a''zolikda chegirmalar kesishmaydi');

-- ---------- Boshqa markaz ----------
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select throws_ok(
  $$ select receive_payment((select s1 from ids), (select cash from ids), today_tashkent(), null,
                            '[{"enrollment_id": null, "amount": 1000}]', 'kb') $$,
  '42501', 'forbidden', 'B markazi A talabasiga to''lov yoza olmaydi');
select pg_temp.logout();

select * from finish();
rollback;
