-- Ko'rsatkichlar (6-bosqich, PRD §6).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(23);

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
   '998903333333', now(), '{"full_name": "Ustoz Charos"}', now(), now());

create temp table roles_json as select '[
  {"key": "owner", "name": "Egasi", "permissions": []},
  {"key": "teacher", "name": "Ustoz", "permissions": ["dashboard.view", "groups.view", "attendance.view", "students.view"]}
]'::jsonb as j;
grant select on roles_json to authenticated;

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select set_config('test.org', register_organization('A', 'Aziz', 'Chilonzor', (select j from roles_json))::text, false);
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select set_config('test.org_b', register_organization('B', 'Botir', 'Yunusobod', (select j from roles_json))::text, false);
select pg_temp.logout();

-- Ikkinchi filial, ustoz (faqat 1-filial), kurs, guruhlar
insert into branches (organization_id, name) values (current_setting('test.org')::uuid, 'Sergeli');
create temp table ids as select
  (select id from branches where organization_id = current_setting('test.org')::uuid and name = 'Chilonzor') as b1,
  (select id from branches where organization_id = current_setting('test.org')::uuid and name = 'Sergeli') as b2,
  today_tashkent() as t;
grant select on ids to authenticated;
insert into staff (organization_id, user_id, role_id, all_branches, is_teacher)
select current_setting('test.org')::uuid, 'c0000000-0000-4000-8000-00000000000c', id, false, true
  from roles where organization_id = current_setting('test.org')::uuid and system_key = 'teacher';
insert into staff_branches (staff_id, branch_id)
select id, (select b1 from ids) from staff where user_id = 'c0000000-0000-4000-8000-00000000000c';
insert into courses (organization_id, name, monthly_price) values (current_setting('test.org')::uuid, 'Ingliz', 680000);
insert into groups (organization_id, branch_id, course_id, teacher_id, name, monthly_price, weekdays, start_time, end_time, start_date)
select current_setting('test.org')::uuid, case when n = 'G1' then (select b1 from ids) else (select b2 from ids) end, c.id,
       case when n = 'G1' then (select id from staff where user_id = 'c0000000-0000-4000-8000-00000000000c') end,
       n, 680000, '{1,2,3,4,5,6,7}', '14:00', '15:30', (select t from ids) - 90
  from courses c, unnest(array['G1', 'G2']) n where c.name = 'Ingliz';

-- Talabalar: S6 — 2-filialda, qolganlari 1-filialda
insert into students (organization_id, branch_id, full_name, phone, joined_at)
select current_setting('test.org')::uuid, case when n = 'S6' then (select b2 from ids) else (select b1 from ids) end,
       n, '+99890000000' || i, (select t from ids) - 60
  from unnest(array['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']) with ordinality as x(n, i);

create function pg_temp.enroll(p_student text, p_group text, p_joined integer, p_activated integer, p_left integer)
returns uuid language sql as $$
  insert into enrollments (organization_id, student_id, group_id, status, joined_at, activated_at, left_at, leave_reason_id)
  select s.organization_id, s.id, g.id,
         (case when p_left is not null then 'left' when p_activated is null then 'trial' else 'active' end)::enrollment_status,
         (select t from ids) - p_joined, (select t from ids) - p_activated, (select t from ids) - p_left,
         case when p_left is not null then (select id from reasons where organization_id = s.organization_id
                                             and kind = 'leave' and name = 'Ko''chib ketdi') end
    from students s, groups g where s.full_name = p_student and g.name = p_group
  returning id
$$;
select pg_temp.enroll('S1', 'G1', 40, 40, null);
select pg_temp.enroll('S2', 'G1', 3, null, null);                       -- sinovda
select pg_temp.enroll('S3', 'G1', 40, 40, null);                        -- bugun muzlatilgan
insert into freezes (organization_id, enrollment_id, date_from, date_to)
select organization_id, id, (select t from ids) - 2, (select t from ids) + 2 from enrollments
 where student_id = (select id from students where full_name = 'S3');
select pg_temp.enroll('S4', 'G1', 40, 40, 10);                          -- 10 kun oldin chiqib ketdi
select pg_temp.enroll('S5', 'G1', 40, 40, 10);                          -- boshqa guruhga o'tkazildi
select pg_temp.enroll('S5', 'G2', 9, 9, null);
select pg_temp.enroll('S6', 'G2', 40, 40, null);
select pg_temp.enroll('S7', 'G1', 60, 60, 40);                          -- chiqib, 20 kundan keyin qaytdi
select pg_temp.enroll('S7', 'G1', 20, 20, null);

-- Pul: S1 qarzdor, S3 ortiqcha to'lagan, S6 qarzdor (to'lovi bekor qilingan)
insert into transactions (organization_id, branch_id, student_id, kind, amount, occurred_on, method_id, payment_ref)
select s.organization_id, s.branch_id, s.id, v.kind::tx_kind, v.amount, (select t from ids) - v.ago,
       case when v.kind = 'payment' then (select id from payment_methods where organization_id = s.organization_id
                                           and name = 'Naqd') end,
       case when v.kind = 'payment' then gen_random_uuid() end
  from students s
  join (values ('S1', 'charge', -680000, 35), ('S1', 'payment', 300000, 5),
               ('S3', 'payment', 500000, 1), ('S6', 'charge', -680000, 30), ('S6', 'payment', 100000, 2))
       v(name, kind, amount, ago) on v.name = s.full_name;
insert into transactions (organization_id, branch_id, student_id, kind, amount, voids_id, method_id, payment_ref)
select organization_id, branch_id, student_id, 'void', -amount, id, method_id, payment_ref from transactions
 where student_id = (select id from students where full_name = 'S6') and kind = 'payment';

-- Darslar: kecha va bugun G1; kecha S1 keldi
insert into lessons (organization_id, group_id, date, start_time, end_time, status)
select organization_id, id, (select t from ids) - o, '14:00', '15:30', case when o = 1 then 'held' else 'scheduled' end::lesson_status
  from groups, unnest(array[0, 1]) o where name = 'G1';
-- Bugungi dars tugaganidan keyin hisobotga kiradi. 14:00 dagisi vaqtga bog'liq bo'lgani uchun bekor qilinadi,
-- o'rniga allaqachon tugagan (00:00–00:00:01) dars — natija kunning istalgan vaqtida bir xil.
update lessons set status = 'cancelled' where date = (select t from ids) and start_time = '14:00';
insert into lessons (organization_id, group_id, date, start_time, end_time, status)
select organization_id, id, (select t from ids), '00:00', '00:00:01', 'scheduled' from groups where name = 'G1';
insert into attendance (organization_id, lesson_id, enrollment_id, status)
select l.organization_id, l.id, e.id, 'present' from lessons l, enrollments e
 where l.date = (select t from ids) - 1 and e.student_id = (select id from students where full_name = 'S1');

-- ---------- Egasi ----------
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select is((select active || '/' || trial || '/' || frozen from metric_students_at(current_setting('test.org')::uuid, null, (select t from ids))),
          '4/1/1', 'bugun: 4 faol (o''tkazilgan va qaytgan bilan), 1 sinovda, 1 muzlatilgan');
select is((select active from metric_students_at(current_setting('test.org')::uuid, (select b1 from ids), (select t from ids))),
          3, 'filial bo''yicha: talaba filiali hisobga olinadi');
select is((select active from metric_students_at(current_setting('test.org')::uuid, null, (select t from ids) - 50)),
          1, 'o''tgan sana: faqat o''sha kuni faol bo''lganlar');
select is((select count(*)::int || '/' || sum(balance) from metric_debtors(current_setting('test.org')::uuid, null, (select t from ids))),
          '2/-1060000', 'qarzdorlar: faol va balansi manfiy (bekor qilingan to''lov hisobga olinmaydi)');
select ok((select count(*) from metric_debtors(current_setting('test.org')::uuid, null, (select t from ids)))
          <= (select active from metric_students_at(current_setting('test.org')::uuid, null, (select t from ids))),
          'invariant: qarzdorlar faol talabalardan oshmaydi');
select ok((select active + trial + frozen from metric_students_at(current_setting('test.org')::uuid, null, (select t from ids)))
          <= (select count(*) from students where organization_id = current_setting('test.org')::uuid),
          'invariant: faol + sinovdagi + muzlatilgan ≤ jami talabalar');
select is((select count(*)::int from metric_debtors(current_setting('test.org')::uuid, null, (select t from ids) - 36)),
          0, 'yechishdan oldingi kunda qarzdor yo''q');
select is((select revenue || '/' || payers || '/' || payments
             from metric_revenue(current_setting('test.org')::uuid, null, (select t from ids) - 30, (select t from ids))),
          '800000/2/2', 'tushum: bekor qilingan to''lovsiz; to''lagan talabalar');
select is((select revenue from metric_revenue(current_setting('test.org')::uuid, (select b2 from ids), (select t from ids) - 30, (select t from ids))),
          0::bigint, '2-filialda tushum yo''q (yagona to''lov bekor qilingan)');
select is((select sum(revenue) from report_finance(current_setting('test.org')::uuid, null, (select t from ids) - 30, (select t from ids))),
          (select revenue::numeric from metric_revenue(current_setting('test.org')::uuid, null, (select t from ids) - 30, (select t from ids))),
          'moliya hisoboti = tushum ko''rsatkichi (bitta ta''rif)');
select is((select string_agg((select full_name from students where id = student_id) || ':' || reason, ',')
             from metric_left_students(current_setting('test.org')::uuid, null, (select t from ids) - 20, (select t from ids))),
          'S4:Ko''chib ketdi', 'ketganlar: o''tkazilgan talaba ketgan emas');

create temp table flow as select report_student_flow(current_setting('test.org')::uuid, null,
                                                     (select t from ids) - 20, (select t from ids)) as j;
grant select on flow to authenticated;
select is((select sum((x ->> 'left')::int) from flow, jsonb_array_elements(j) x), 1::bigint, 'oqim: chiqqan 1');
select is((select sum((x ->> 'returned')::int) from flow, jsonb_array_elements(j) x), 1::bigint,
          'oqim: qaytgan 1 (20 kundan keyin)');
select is((select sum((x ->> 'activated')::int) from flow, jsonb_array_elements(j) x), 1::bigint,
          'oqim: faollashgan — o''tkazish hisobga olinmaydi');

select is((select j -> 'totals' ->> 'cells' || '/' || (j -> 'totals' ->> 'marked') || '/' || (j -> 'totals' ->> 'present')
             from (select report_attendance(current_setting('test.org')::uuid, null, (select t from ids) - 1, (select t from ids)) j) x),
          '6/1/1', 'davomat: kataklar (muzlatilgan va chiqqanlarsiz), belgilangan, keldi');

-- ---------- Ustoz (faqat 1-filial, moliya ruxsati yo'q) ----------
select pg_temp.login('c0000000-0000-4000-8000-00000000000c');
select is((select groups || '/' || students || '/' || lessons || '/' || unmarked
             from teacher_summary(current_setting('test.org')::uuid, (select t from ids))),
          '1/4/1/1', 'ustoz: o''z guruhi, talabalari, bugungi va belgilanmagan darslari');
select throws_ok($$ select * from metric_revenue(current_setting('test.org')::uuid, null, (select t from ids) - 30, (select t from ids)) $$,
  '42501', 'forbidden', 'moliya ruxsatisiz tushum ko''rinmaydi');
select throws_ok($$ select * from metric_students_at(current_setting('test.org')::uuid, (select b2 from ids), (select t from ids)) $$,
  '42501', 'forbidden', 'biriktirilmagan filial ko''rinmaydi');
select is((select active from metric_students_at(current_setting('test.org')::uuid, null, (select t from ids))),
          3, 'filtrsiz — faqat o''z filiallari');

-- ---------- Boshqa markaz ----------
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select throws_ok($$ select * from metric_students_at(current_setting('test.org')::uuid, null, (select t from ids)) $$,
  '42501', 'forbidden', 'B markazi A ko''rsatkichlarini ko''rmaydi');
select pg_temp.logout();

-- ---------- Chegaralar ----------
-- S8: bugun chiqib ketdi — kechagacha faol, bugun (kun oxirida) emas, ro'yxatdagi "Chiqqan" kabi.
-- S9: 14 kun oldin chiqib, bugun qaytdi — aynan 14 kun ham "qaytgan".
insert into students (organization_id, branch_id, full_name, phone, joined_at)
select current_setting('test.org')::uuid, (select b1 from ids), n, '+99890000010' || i, (select t from ids) - 60
  from unnest(array['S8', 'S9']) with ordinality as x(n, i);
select pg_temp.enroll('S8', 'G1', 40, 40, 0);
select pg_temp.enroll('S9', 'G1', 40, 40, 14);
select pg_temp.enroll('S9', 'G1', 0, 0, null);
select is((select string_agg(state, ',') from student_states_at(current_setting('test.org')::uuid, (select t from ids) - 1)
             where student_id = (select id from students where full_name = 'S8'))
          || '/' || (select count(*) from student_states_at(current_setting('test.org')::uuid, (select t from ids))
                      where student_id = (select id from students where full_name = 'S8')),
          'active/0', 'bugun chiqqan talaba kecha faol, bugun hisobda yo''q');
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select is((select count(*)::int from metric_left_students(current_setting('test.org')::uuid, null, (select t from ids), (select t from ids))),
          1, 'bugun chiqqan — bugungi ketganlarda');
select is((select (x ->> 'returned')::int from jsonb_array_elements(
             report_student_flow(current_setting('test.org')::uuid, null, (select t from ids), (select t from ids))) x),
          1, 'aynan 14 kundan keyin qaytgan ham "qaytgan"');
select pg_temp.logout();

select * from finish();
rollback;
