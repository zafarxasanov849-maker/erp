-- RLS va markaz izolyatsiyasi testlari (1-bosqich).
-- Ishga tushirish: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(35);

-- ---------- Yordamchilar ----------
create function pg_temp.login(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true);
  select set_config('request.jwt.claims', '', true);
$$;

-- Joriy foydalanuvchi `org` markazidan qaysi jadvallarda nechta qator ko'radi.
create function pg_temp.visible(p_org uuid) returns setof text language plpgsql as $$
declare
  t text;
  n int;
begin
  for t in
    select c.table_name from information_schema.columns c
      join information_schema.tables tt
        on tt.table_schema = c.table_schema and tt.table_name = c.table_name
     where c.table_schema = 'public' and c.column_name = 'organization_id'
       and tt.table_type = 'BASE TABLE'
  loop
    execute format('select count(*) from public.%I where organization_id = $1', t) into n using p_org;
    if n > 0 then return next t || ':' || n; end if;
  end loop;
  select count(*) into n from public.organizations where id = p_org;
  if n > 0 then return next 'organizations:' || n; end if;
end $$;

grant execute on function pg_temp.visible(uuid) to authenticated;

-- ---------- Foydalanuvchilar ----------
insert into auth.users (id, instance_id, aud, role, phone, phone_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('a0000000-0000-4000-8000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998901111111', now(), '{"full_name": "Aziz Egasi"}', now(), now()),
  ('b0000000-0000-4000-8000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998902222222', now(), '{"full_name": "Botir Egasi"}', now(), now()),
  ('c0000000-0000-4000-8000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998903333333', now(), '{"full_name": "Charos Admin", "must_change_password": true}', now(), now()),
  ('d0000000-0000-4000-8000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   '998904444444', null, '{"full_name": "Dilshod"}', now(), now());

select is((select phone from profiles where id = 'a0000000-0000-4000-8000-00000000000a'),
          '+998901111111', 'profiles: trigger telefonni +998 bilan yozadi');
select is((select must_change_password from profiles where id = 'c0000000-0000-4000-8000-00000000000c'),
          true, 'profiles: vaqtinchalik parol belgisi metadata''dan olinadi');

-- Rollar (TS dagi SYSTEM_ROLE_PERMISSIONS ning qisqa varianti)
create temp table roles_json as select '[
  {"key": "owner", "name": "Egasi", "permissions": []},
  {"key": "admin", "name": "Admin", "permissions": ["dashboard.view", "students.view", "students.create", "payments.create", "*"]}
]'::jsonb as j;
grant select on roles_json to authenticated;

-- ---------- Markaz ochish ----------
select pg_temp.login('d0000000-0000-4000-8000-00000000000d');
select throws_ok(
  $$ select register_organization('D markazi', 'Dilshod', 'Filial', (select j from roles_json)) $$,
  'P0001', 'phone_not_confirmed', 'tasdiqlanmagan telefon bilan markaz ochib bo''lmaydi');

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select set_config('test.org_a',
  register_organization('A markazi', 'Aziz Egasi', 'Chilonzor', (select j from roles_json))::text, false);

select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select set_config('test.org_b',
  register_organization('B markazi', 'Botir Egasi', 'Yunusobod', (select j from roles_json))::text, false);

select pg_temp.logout();
select set_config('test.role_b',
  (select id from roles where organization_id = current_setting('test.org_b')::uuid and system_key = 'admin')::text, false);
select is((select count(*)::int from roles where organization_id = current_setting('test.org_a')::uuid), 2,
          'register: rollar yaratildi');
select is((select permissions from roles where organization_id = current_setting('test.org_a')::uuid and system_key = 'owner'),
          array['*'], 'register: egasi roli doim *');
select ok(not exists (select 1 from roles where organization_id = current_setting('test.org_a')::uuid
                     and system_key = 'admin' and '*' = any (permissions)),
          'register: boshqa rollarga * berilmaydi');
select is((select count(*)::int from payment_methods where organization_id = current_setting('test.org_a')::uuid), 6,
          'register: to''lov turlari');
select is((select count(*)::int from expense_categories where organization_id = current_setting('test.org_a')::uuid and kind = 'owner_draw'), 1,
          'register: owner_draw turkumi');
select is((select count(*)::int from reasons where organization_id = current_setting('test.org_a')::uuid), 17,
          'register: sabablar');
select is((select count(*)::int from pipeline_stages where organization_id = current_setting('test.org_a')::uuid), 6,
          'register: Asosiy varonka bosqichlari');
select ok((select all_branches from staff where organization_id = current_setting('test.org_a')::uuid
            and user_id = 'a0000000-0000-4000-8000-00000000000a'),
          'register: egasi barcha filiallarni ko''radi');
select ok(exists (select 1 from audit_log where organization_id = current_setting('test.org_a')::uuid and action = 'staff.insert'),
          'audit: xodim qo''shilgani yozildi');

-- ---------- Izolyatsiya ----------
select pg_temp.login('b0000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from pg_temp.visible(current_setting('test.org_a')::uuid)), 0,
          'B markazi foydalanuvchisi A markazidan hech narsa ko''rmaydi');
select ok((select count(*) from pg_temp.visible(current_setting('test.org_b')::uuid)) >= 8,
          'B o''z markazini ko''radi');
select is((select count(*)::int from profiles where id = 'a0000000-0000-4000-8000-00000000000a'), 0,
          'boshqa markaz egasining profili ko''rinmaydi');

update organizations set name = 'buzildi' where id = current_setting('test.org_a')::uuid;
select throws_ok(
  format($$ insert into branches (organization_id, name) values (%L, 'begona') $$, current_setting('test.org_a')),
  '42501', null, 'boshqa markazga filial qo''shib bo''lmaydi');

select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
select is((select count(*)::int from pg_temp.visible(current_setting('test.org_b')::uuid)), 0,
          'A markazi foydalanuvchisi B markazidan hech narsa ko''rmaydi');
select is((select name from organizations where id = current_setting('test.org_a')::uuid), 'A markazi',
          'B boshqa markaz nomini o''zgartira olmadi');

-- ---------- Xodim qo'shish va admin cheklovlari ----------
select lives_ok(
  $$ select save_staff(current_setting('test.org_a')::uuid,
       (select id from roles where organization_id = current_setting('test.org_a')::uuid and system_key = 'admin'),
       false, false, array(select id from branches where organization_id = current_setting('test.org_a')::uuid),
       p_user_id => 'c0000000-0000-4000-8000-00000000000c') $$,
  'egasi admin xodim qo''shadi');

select throws_ok(
  $$ select save_staff(current_setting('test.org_a')::uuid, current_setting('test.role_b')::uuid,
       false, false, '{}', p_user_id => 'd0000000-0000-4000-8000-00000000000d') $$,
  '23503', null, 'boshqa markaz rolini berib bo''lmaydi');

select throws_ok(
  $$ insert into staff_branches (staff_id, branch_id)
     select (select id from staff where user_id = 'c0000000-0000-4000-8000-00000000000c'),
            (select id from branches where organization_id = current_setting('test.org_b')::uuid limit 1) $$,
  null, null, 'boshqa markaz filialini biriktirib bo''lmaydi');

select throws_ok(
  $$ update roles set name = 'Boss' where system_key = 'owner' and organization_id = current_setting('test.org_a')::uuid $$,
  'P0001', 'owner_role_locked', 'egasi rolini tahrirlab bo''lmaydi');
delete from roles where system_key = 'admin' and organization_id = current_setting('test.org_a')::uuid;
select is((select count(*)::int from roles where system_key = 'admin' and organization_id = current_setting('test.org_a')::uuid),
          1, 'tizim rolini o''chirib bo''lmaydi');
select throws_ok(
  $$ update staff set is_active = false where user_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  'P0001', 'self_deactivate', 'o''zini nofaol qilib bo''lmaydi');
select throws_ok(
  $$ update profiles set is_super_admin = true where id = auth.uid() $$,
  '42501', null, 'is_super_admin ni o''zi o''zgartira olmaydi');

select pg_temp.login('c0000000-0000-4000-8000-00000000000c');
update roles set permissions = array['*'] where organization_id = current_setting('test.org_a')::uuid and system_key = 'admin';
select throws_ok(
  format($$ insert into roles (organization_id, name, permissions) values (%L, 'Yangi', '{}') $$, current_setting('test.org_a')),
  '42501', null, 'admin rol yarata olmaydi');
select is((select count(*)::int from audit_log), 0, 'admin audit jurnalini ko''rmaydi');
select throws_ok(
  $$ select * from find_profile_by_phone(current_setting('test.org_a')::uuid, '+998904444444') $$,
  '42501', 'forbidden', 'admin telefon bo''yicha foydalanuvchi qidira olmaydi');
select is((select count(*)::int from pg_temp.visible(current_setting('test.org_b')::uuid)), 0,
          'admin B markazini ko''rmaydi');

select pg_temp.logout();
select ok(not exists (select 1 from roles where organization_id = current_setting('test.org_a')::uuid
                     and system_key = 'admin' and '*' = any (permissions)),
          'admin o''z rolini o''zgartira olmadi');

-- ---------- Ruxsatni oshirishga urinish ----------
select pg_temp.login('a0000000-0000-4000-8000-00000000000a');
insert into roles (organization_id, name, permissions)
values (current_setting('test.org_a')::uuid, 'Kadrlar', array['dashboard.view', 'settings.staff']);
update staff set role_id = (select id from roles where name = 'Kadrlar' and organization_id = current_setting('test.org_a')::uuid)
 where user_id = 'c0000000-0000-4000-8000-00000000000c';

select pg_temp.login('c0000000-0000-4000-8000-00000000000c');
select throws_ok(
  $$ update staff set role_id = (select id from roles where system_key = 'owner' and organization_id = current_setting('test.org_a')::uuid)
      where user_id = 'c0000000-0000-4000-8000-00000000000c' $$,
  'P0001', 'permission_escalation', 'o''ziga egasi rolini bera olmaydi');
select throws_ok(
  $$ update staff set all_branches = true where user_id = 'c0000000-0000-4000-8000-00000000000c' $$,
  'P0001', 'permission_escalation', 'branches.all ruxsatisiz barcha filiallarni ocha olmaydi');
select throws_ok(
  $$ update staff set is_teacher = true where user_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  'P0001', 'owner_locked', 'egasi yozuvini o''zgartira olmaydi');
select is((select count(*)::int from find_profile_by_phone(current_setting('test.org_a')::uuid, '+998904444444')), 1,
          'settings.staff bilan telefon bo''yicha topadi');

select pg_temp.logout();
select ok(exists (select 1 from audit_log where organization_id = current_setting('test.org_a')::uuid and action = 'roles.insert'),
          'audit: rol yaratilgani yozildi');

select * from finish();
rollback;
