-- Xarajatlar, kassa, ish haqi (7-bosqich, PRD §3.6).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(33);

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
   '998901111111', now(), '{"full_name": "Aziz Egasi"}', now(), now()),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998902222222', now(), '{"full_name": "Botir"}', now(), now()),
  ('c0000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998903333333', now(), '{"full_name": "Ustoz Charos"}', now(), now()),
  ('d0000000-0000-4000-8000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998904444444', now(), '{"full_name": "Admin Dilya"}', now(), now());

create temp table roles_json as select '[
  {"key": "owner", "name": "Egasi", "permissions": []},
  {"key": "admin", "name": "Admin", "permissions": ["dashboard.view", "students.view", "groups.view", "attendance.view",
     "attendance.manage", "payments.view", "payments.create", "expenses.view", "expenses.create", "cash.view",
     "cash.handover"]},
  {"key": "teacher", "name": "Ustoz", "permissions": ["dashboard.view", "groups.view", "attendance.view"]}
]'::jsonb as j;
grant select on roles_json to authenticated;

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select set_config('test.org', register_organization('A', 'Aziz Egasi', 'Chilonzor', (select j from roles_json))::text, false);
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select set_config('test.org_b', register_organization('B', 'Botir', 'Yunusobod', (select j from roles_json))::text, false);
select pg_temp.logout();

-- Xodimlar: admin (1-filial), ustoz (1-filial)
insert into staff (organization_id, user_id, role_id, all_branches, is_teacher)
select current_setting('test.org')::uuid, u, r.id, false, k = 'teacher'
  from (values ('c0000000-0000-4000-8000-00000000000c'::uuid, 'teacher'),
               ('d0000000-0000-4000-8000-00000000000d'::uuid, 'admin')) v(u, k)
  join roles r on r.organization_id = current_setting('test.org')::uuid and r.system_key = v.k;
insert into staff_branches (staff_id, branch_id)
select s.id, b.id from staff s join branches b on b.organization_id = s.organization_id
 where s.organization_id = current_setting('test.org')::uuid
   and s.user_id in ('c0000000-0000-4000-8000-00000000000c', 'd0000000-0000-4000-8000-00000000000d');

create temp table ids as select
  (select id from branches where organization_id = current_setting('test.org')::uuid) as b1,
  (select id from staff where user_id = 'a0000000-0000-4000-8000-00000000000a') as owner,
  (select id from staff where user_id = 'c0000000-0000-4000-8000-00000000000c') as teacher,
  (select id from staff where user_id = 'd0000000-0000-4000-8000-00000000000d') as admin,
  (select id from payment_methods where organization_id = current_setting('test.org')::uuid and name = 'Naqd') as cash,
  (select id from payment_methods where organization_id = current_setting('test.org')::uuid and name = 'Uzcard') as card,
  (select id from payment_methods where organization_id = current_setting('test.org')::uuid and name = 'Terminal') as terminal,
  (select id from expense_categories where organization_id = current_setting('test.org')::uuid and name = 'Ijara') as rent,
  (select id from expense_categories where organization_id = current_setting('test.org')::uuid and kind = 'owner_draw') as draw,
  (select id from expense_categories where organization_id = current_setting('test.org_b')::uuid and name = 'Ijara') as rent_b,
  date_trunc('month', today_tashkent())::date as month;
grant select on ids to authenticated;

-- Guruh (ustoz C), ikki talaba
insert into courses (organization_id, name, monthly_price) values (current_setting('test.org')::uuid, 'Ingliz', 600000);
insert into groups (organization_id, branch_id, course_id, teacher_id, name, monthly_price, weekdays, start_time, end_time, start_date)
select current_setting('test.org')::uuid, (select b1 from ids), c.id, (select teacher from ids), 'G1', 600000,
       '{1,2,3,4,5,6,7}', '14:00', '15:30', today_tashkent() - 60
  from courses c where c.name = 'Ingliz' and c.organization_id = current_setting('test.org')::uuid;
insert into students (organization_id, branch_id, full_name, phone, joined_at)
select current_setting('test.org')::uuid, (select b1 from ids), n, '+99890000000' || i, today_tashkent() - 30
  from unnest(array['S1', 'S2']) with ordinality x(n, i);
insert into enrollments (organization_id, student_id, group_id, status, joined_at, activated_at)
select s.organization_id, s.id, g.id, 'active', today_tashkent() - 30, today_tashkent() - 30
  from students s, groups g where g.name = 'G1' and g.organization_id = current_setting('test.org')::uuid and s.organization_id = current_setting('test.org')::uuid;
create temp table enr as select
  (select e.id from enrollments e join students s on s.id = e.student_id where s.full_name = 'S1' and s.organization_id = current_setting('test.org')::uuid) as e1,
  (select e.id from enrollments e join students s on s.id = e.student_id where s.full_name = 'S2' and s.organization_id = current_setting('test.org')::uuid) as e2,
  (select id from students where full_name = 'S1' and organization_id = current_setting('test.org')::uuid) as s1,
  (select id from students where full_name = 'S2' and organization_id = current_setting('test.org')::uuid) as s2;
grant select on enr to authenticated;

-- Bugungi darslar: biri belgilangan, biri bekor qilingan
insert into lessons (organization_id, group_id, date, start_time, end_time, status)
select organization_id, id, today_tashkent(), t::time, (t::time + interval '1 hour')::time,
       case when t = '08:00' then 'held' else 'cancelled' end::lesson_status
  from groups, unnest(array['08:00', '10:00']) t where name = 'G1' and organization_id = current_setting('test.org')::uuid;
insert into attendance (organization_id, lesson_id, enrollment_id, status)
select l.organization_id, l.id, (select e1 from enr), 'present' from lessons l where l.start_time = '08:00' and l.organization_id = current_setting('test.org')::uuid;

-- ---------- Admin: to'lovlar ----------
select pg_temp.login('d0000000-0000-4000-8000-00000000000d');
select receive_payment((select s1 from enr), (select cash from ids), today_tashkent(), null,
  jsonb_build_array(jsonb_build_object('enrollment_id', (select e1 from enr), 'amount', 500000),
                    jsonb_build_object('enrollment_id', null, 'amount', 50000)), 'p1');
select receive_payment((select s2 from enr), (select card from ids), today_tashkent(), null,
  jsonb_build_array(jsonb_build_object('enrollment_id', (select e2 from enr), 'amount', 200000)), 'p2');
select receive_payment((select s1 from enr), (select terminal from ids), today_tashkent(), null,
  jsonb_build_array(jsonb_build_object('enrollment_id', (select e1 from enr), 'amount', 100000)), 'p3');

-- ---------- Xarajatlar ----------
select throws_ok($$ insert into expenses (organization_id, branch_id, category_id, amount)
                    values (current_setting('test.org')::uuid, (select b1 from ids), (select rent from ids), 1000) $$,
  '42501', null, 'xarajatni to''g''ridan-to''g''ri yozib bo''lmaydi');
select ok(save_expense(null, (select b1 from ids), (select rent from ids), 50000, (select cash from ids),
                       today_tashkent(), 'Suv', null, false) is not null, 'admin xarajat qo''shadi');
select is((select from_staff_id from expenses where recipient = 'Suv' and organization_id = current_setting('test.org')::uuid), (select admin from ids),
          'xarajat — admin qo''lidan');
select throws_ok($$ select save_expense(null, (select b1 from ids), (select rent from ids), 1000, (select cash from ids),
                       today_tashkent() + 1, null, null, false) $$,
  'P0001', 'expense_date_invalid', 'kelajak sana bilan bo''lmaydi');
select throws_ok($$ select save_expense(null, (select b1 from ids), (select rent_b from ids), 1000, (select cash from ids),
                       today_tashkent(), null, null, false) $$,
  'P0001', 'expense_category_mismatch', 'boshqa markaz turkumi bo''lmaydi');
select throws_ok($$ select save_expense((select id from expenses where recipient = 'Suv' and organization_id = current_setting('test.org')::uuid), (select b1 from ids),
                       (select rent from ids), 60000, (select cash from ids), today_tashkent(), 'Suv', null, false) $$,
  '42501', 'forbidden', 'admin tahrirlay olmaydi (expenses.update yo''q)');
select throws_ok($$ select set_expense_deleted((select id from expenses where recipient = 'Suv' and organization_id = current_setting('test.org')::uuid), true, 'xato') $$,
  '42501', 'forbidden', 'admin o''chira olmaydi');

-- ---------- Kassa (admin o'zini ko'radi) ----------
select is((select string_agg(received || '/' || spent || '/' || closing, ',' order by method_id = (select cash from ids) desc)
             from cash_positions(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())
            where staff_id = (select admin from ids)),
          '550000/50000/500000,200000/0/200000', 'admin qo''lida: naqd 550 000 − 50 000, karta 200 000');
select is((select count(*)::int from cash_positions(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())
            where method_id = (select terminal from ids)), 0, 'terminal qo''lda hisoblanmaydi');
select throws_ok($$ select handover_cash((select b1 from ids), (select admin from ids), (select cash from ids), 1000, null) $$,
  'P0001', 'handover_target_invalid', 'o''ziga topshirib bo''lmaydi');
select throws_ok($$ select handover_cash((select b1 from ids), (select owner from ids), (select terminal from ids), 1000, null) $$,
  'P0001', 'method_not_in_hand', 'terminal pulini topshirib bo''lmaydi');
select ok(handover_cash((select b1 from ids), (select owner from ids), (select cash from ids), 300000, 'kechki') is not null,
          'admin egasiga 300 000 topshiradi');
select is((select closing from cash_positions(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())
            where staff_id = (select admin from ids) and method_id = (select cash from ids)),
          200000::bigint, 'topshirgandan keyin adminda 200 000');

-- ---------- Egasi ----------
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select is((select handed_in from cash_positions(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())
            where staff_id = (select owner from ids) and method_id = (select cash from ids)),
          300000::bigint, 'egasi 300 000 oldi');
select void_payment((select payment_ref from transactions where idempotency_key = 'payment:p2:1' and organization_id = current_setting('test.org')::uuid), 'xato karta');
select is((select closing from cash_positions(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())
            where staff_id = (select admin from ids) and method_id = (select card from ids)),
          0::bigint, 'bekor qilingan to''lov — qabul qilgan admin qo''lidan kamayadi');
select handover_cash((select b1 from ids), null, (select cash from ids), 100000, 'kassaga');
select save_expense(null, (select b1 from ids), (select rent from ids), 40000, (select cash from ids),
                    today_tashkent(), 'Kassadan', null, true);
select is((select closing from cash_positions(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())
            where staff_id is null and kassa_branch_id = (select b1 from ids)),
          60000::bigint, 'filial kassasi: 100 000 − 40 000');
select void_handover((select id from cash_handovers where note = 'kechki' and organization_id = current_setting('test.org')::uuid), 'noto''g''ri');
select is((select closing from cash_positions(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())
            where staff_id = (select admin from ids) and method_id = (select cash from ids)),
          500000::bigint, 'topshirish bekor qilindi — pul adminga qaytdi');
select is((select opening from cash_positions(current_setting('test.org')::uuid, null, today_tashkent() + 1, today_tashkent() + 1)
            where staff_id = (select admin from ids) and method_id = (select cash from ids)),
          500000::bigint, 'ertangi davr boshi = bugungi qoldiq');

-- Xarajat savati va hisobot
select set_expense_deleted((select id from expenses where recipient = 'Suv' and organization_id = current_setting('test.org')::uuid), true, 'xato');
select is((select sum(amount) from report_expenses(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())),
          40000::numeric, 'savatdagi xarajat hisobotga kirmaydi');
select set_expense_deleted((select id from expenses where recipient = 'Suv' and organization_id = current_setting('test.org')::uuid), false, null);
select is((select sum(amount) from report_expenses(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent())),
          90000::numeric, 'savatdan qaytarildi');

-- ---------- Ish haqi ----------
select throws_ok($$ select add_salary_entry((select teacher from ids), ((select month from ids) + interval '1 month')::date,
                       'bonus', 1000, null, null, null, false, null) $$,
  'P0001', 'salary_period_invalid', 'kelajak oy uchun yozib bo''lmaydi');
select add_salary_entry((select teacher from ids), (select month from ids), 'payout', 700000, null,
                        (select cash from ids), (select b1 from ids), false, today_tashkent());
select is((select c.kind::text || '/' || e.amount from expenses e join expense_categories c on c.id = e.category_id
            where e.salary_entry_id is not null),
          'salary/700000', 'oylik berildi — "Ish haqi" xarajati avtomatik');
select throws_ok($$ select set_expense_deleted((select id from expenses where salary_entry_id is not null and organization_id = current_setting('test.org')::uuid), true, 'x') $$,
  'P0001', 'expense_salary_linked', 'oylik xarajatini alohida o''chirib bo''lmaydi');
select add_salary_entry((select teacher from ids), (select month from ids), 'override', 900000, null, null, null, false, null);
select add_salary_entry((select teacher from ids), (select month from ids), 'override', 950000, null, null, null, false, null);
select is((select count(*)::int from salary_entries where kind = 'override' and voided_at is null and organization_id = current_setting('test.org')::uuid), 1,
          'oyga xos o''zgartirish bitta — oldingisi almashtirildi');
select void_salary_entry((select id from salary_entries where kind = 'payout' and organization_id = current_setting('test.org')::uuid), 'xato summa');
select ok((select deleted_at is not null from expenses where salary_entry_id is not null and organization_id = current_setting('test.org')::uuid),
          'oylik bekor qilindi — xarajat savatga tushdi');
select add_salary_entry((select admin from ids), (select month from ids), 'bonus', 100000, null, null, null, false, null);
select throws_ok($$ insert into salary_rules (organization_id, staff_id, type, amount, percent, valid_from)
                    values (current_setting('test.org')::uuid, (select teacher from ids), 'percent_of_revenue', 1000, 30,
                            today_tashkent()) $$,
  'P0001', 'salary_rule_invalid', 'foizli kelishuvda summa bo''lmaydi');
insert into salary_rules (organization_id, staff_id, type, percent, valid_from)
values (current_setting('test.org')::uuid, (select teacher from ids), 'percent_of_revenue', 30, (select month from ids));
select is((select sum(revenue) || '/' || sum(marked_lessons)
             from payroll_group_stats(current_setting('test.org')::uuid, (select month from ids), (select teacher from ids))),
          '600000/1', 'oylik asosi: guruhga bog''langan to''lovlar (bekor qilingan va avanssiz), belgilangan darslar');

-- ---------- Ustoz ----------
select pg_temp.login('c0000000-0000-4000-8000-00000000000c');
select is((select count(*)::int from salary_entries where organization_id = current_setting('test.org')::uuid), 3, 'ustoz faqat o''z yozuvlarini ko''radi');
select lives_ok($$ select * from payroll_group_stats(current_setting('test.org')::uuid, (select month from ids), (select teacher from ids)) $$,
  'ustoz o''z hisobini ko''ra oladi');
select throws_ok($$ select * from payroll_group_stats(current_setting('test.org')::uuid, (select month from ids), (select admin from ids)) $$,
  '42501', 'forbidden', 'ustoz boshqaning hisobini ko''ra olmaydi');
select throws_ok($$ select add_salary_entry((select teacher from ids), (select month from ids), 'bonus', 1000, null, null,
                       null, false, null) $$,
  '42501', 'forbidden', 'ustoz o''ziga bonus yozolmaydi');
select throws_ok($$ select * from cash_positions(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent()) $$,
  '42501', 'forbidden', 'kassa ruxsatisiz kassa ko''rinmaydi');

-- ---------- Boshqa markaz ----------
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select throws_ok($$ select * from report_expenses(current_setting('test.org')::uuid, null, (select month from ids), today_tashkent()) $$,
  '42501', 'forbidden', 'B markazi A xarajatlarini ko''rmaydi');
select pg_temp.logout();

select * from finish();
rollback;
