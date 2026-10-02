-- =====================================================================
-- 1-bosqich: auth, markaz ochish, rollar, xodimlar, RLS siyosatlari, audit.
-- =====================================================================

-- ---------- Sxema qo'shimchalari ----------
alter table profiles add column must_change_password boolean not null default false;

-- Tizim rollarini nomidan qat'i nazar aniqlash uchun (nomini markaz o'zgartirishi mumkin).
alter table roles add column system_key text;
alter table roles add constraint roles_system_key_chk
  check (system_key is null or system_key in ('owner', 'ceo', 'manager', 'admin', 'sales', 'teacher'));
alter table roles add constraint roles_system_key_consistent check (is_system = (system_key is not null));
alter table roles add constraint roles_system_key_uniq unique (organization_id, system_key);

-- Xodim roli boshqa markazga tegishli bo'lib qolmasligi uchun kompozit FK.
alter table roles add constraint roles_id_org_uniq unique (id, organization_id);
alter table staff add constraint staff_role_same_org
  foreign key (role_id, organization_id) references roles (id, organization_id);

create index on staff (user_id);
create index on staff_branches (branch_id);

-- ---------- Yordamchi funksiyalar ----------
create or replace function public.current_staff_id(org uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from staff where organization_id = org and user_id = auth.uid() and is_active limit 1
$$;

create or replace function public.my_permissions(org uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(
    (select r.permissions from staff s join roles r on r.id = s.role_id
      where s.organization_id = org and s.user_id = auth.uid() and s.is_active limit 1),
    '{}'::text[])
$$;

create or replace function public.staff_org(p_staff uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from staff where id = p_staff
$$;

-- Hamkasb: men bilan kamida bitta markazda faol xodim.
create or replace function public.is_colleague(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff me join staff them on them.organization_id = me.organization_id
    where me.user_id = auth.uid() and me.is_active and them.user_id = p_user
  )
$$;

create or replace function public.can_see_group(org uuid, p_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from groups g
    where g.id = p_group and g.organization_id = org
      and ((has_permission(org, 'groups.view') and can_see_branch(org, g.branch_id))
           or g.teacher_id = current_staff_id(org))
  )
$$;

create or replace function public.can_see_student(org uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from students s
    where s.id = p_student and s.organization_id = org
      and has_permission(org, 'students.view') and can_see_branch(org, s.branch_id)
  )
$$;

create or replace function public.can_edit_student(org uuid, p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from students s
    where s.id = p_student and s.organization_id = org
      and has_permission(org, 'students.update') and can_see_branch(org, s.branch_id)
  )
$$;

create or replace function public.enrollment_student(p_enrollment uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select student_id from enrollments where id = p_enrollment
$$;

create or replace function public.can_see_lead(org uuid, p_lead uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from leads l
    where l.id = p_lead and l.organization_id = org
      and has_permission(org, 'leads.view')
      and (l.branch_id is null or can_see_branch(org, l.branch_id))
      and (has_permission(org, 'leads.view_all') or l.assigned_to is null
           or l.assigned_to = current_staff_id(org))
  )
$$;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

-- ---------- Yangi foydalanuvchi → profiles ----------
-- GoTrue telefonni "998901234567" ko'rinishida saqlaydi; biz "+998901234567".
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, must_change_password)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    case when coalesce(new.phone, '') <> '' then '+' || ltrim(new.phone, '+') end,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_phone_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set phone = case when coalesce(new.phone, '') <> '' then '+' || ltrim(new.phone, '+') end
   where id = new.id;
  return new;
end $$;

create trigger on_auth_user_phone_changed
  after update of phone on auth.users
  for each row when (old.phone is distinct from new.phone)
  execute function public.handle_user_phone_change();

-- ---------- Himoya triggerlari (faqat foydalanuvchi so'rovlari uchun) ----------
-- SECURITY DEFINER funksiyalar (register_organization) va service role ichida current_user
-- 'authenticated' emas — u yerda tekshiruv o'tkazib yuboriladi.

create or replace function public.roles_guard()
returns trigger language plpgsql set search_path = public as $$
declare
  mine text[];
  added text[];
begin
  if current_user <> 'authenticated' then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'system_role_delete' using errcode = 'P0001';
    end if;
    return old;
  end if;

  mine := my_permissions(new.organization_id);

  if tg_op = 'INSERT' then
    if new.is_system or new.system_key is not null then
      raise exception 'system_role_insert' using errcode = 'P0001';
    end if;
    added := new.permissions;
  else
    if old.system_key = 'owner' then
      raise exception 'owner_role_locked' using errcode = 'P0001';
    end if;
    if new.is_system is distinct from old.is_system
       or new.system_key is distinct from old.system_key
       or new.organization_id <> old.organization_id then
      raise exception 'role_immutable_fields' using errcode = 'P0001';
    end if;
    added := array(select unnest(new.permissions) except select unnest(old.permissions));
  end if;

  -- O'zida yo'q ruxsatni boshqa rolga qo'shib bo'lmaydi.
  if not ('*' = any (mine)) and not (added <@ mine) then
    raise exception 'permission_escalation' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger roles_guard
  before insert or update or delete on roles
  for each row execute function public.roles_guard();

create or replace function public.staff_guard()
returns trigger language plpgsql set search_path = public as $$
declare
  mine text[];
  role_perms text[];
  old_is_owner boolean := false;
  new_is_owner boolean;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  mine := my_permissions(new.organization_id);
  select permissions, system_key = 'owner' into role_perms, new_is_owner
    from roles where id = new.role_id and organization_id = new.organization_id;

  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.organization_id <> old.organization_id then
      raise exception 'staff_immutable_fields' using errcode = 'P0001';
    end if;
    select coalesce(system_key = 'owner', false) into old_is_owner from roles where id = old.role_id;
    -- Egasi yozuvini faqat egasi o'zgartiradi
    if old_is_owner and not ('*' = any (mine)) then
      raise exception 'owner_locked' using errcode = 'P0001';
    end if;
    if new.user_id = auth.uid() and not new.is_active then
      raise exception 'self_deactivate' using errcode = 'P0001';
    end if;
    -- Oxirgi faol egasini yo'qotmaslik
    if old_is_owner and old.is_active and (not new_is_owner or not new.is_active) and not exists (
      select 1 from staff s join roles r on r.id = s.role_id
       where s.organization_id = new.organization_id and s.id <> new.id
         and s.is_active and r.system_key = 'owner') then
      raise exception 'last_owner' using errcode = 'P0001';
    end if;
  end if;

  if (tg_op = 'INSERT' or new.role_id is distinct from old.role_id)
     and not ('*' = any (mine)) and not (role_perms <@ mine) then
    raise exception 'permission_escalation' using errcode = 'P0001';
  end if;

  if new.all_branches and (tg_op = 'INSERT' or not old.all_branches)
     and not ('*' = any (mine) or 'branches.all' = any (mine)) then
    raise exception 'permission_escalation' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger staff_guard
  before insert or update on staff
  for each row execute function public.staff_guard();

-- Filial xodim bilan bir markazda bo'lishi shart (hamma uchun).
create or replace function public.staff_branches_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from staff s join branches b on b.organization_id = s.organization_id
     where s.id = new.staff_id and b.id = new.branch_id) then
    raise exception 'branch_org_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger staff_branches_guard
  before insert or update on staff_branches
  for each row execute function public.staff_branches_guard();

-- ---------- Audit ----------
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
  else
    v_org := (v_row ->> 'organization_id')::uuid;
    v_id := (v_row ->> 'id')::uuid;
  end if;

  -- Markaz o'chirilayotgan bo'lsa (cascade) — yozmaymiz.
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

create trigger audit_organizations after update on organizations
  for each row execute function public.audit_row();
create trigger audit_branches after insert or update or delete on branches
  for each row execute function public.audit_row();
create trigger audit_roles after insert or update or delete on roles
  for each row execute function public.audit_row();
create trigger audit_staff after insert or update or delete on staff
  for each row execute function public.audit_row();
create trigger audit_staff_branches after insert or delete on staff_branches
  for each row execute function public.audit_row();

-- ---------- Markaz ochish (bitta tranzaksiya) ----------
-- p_roles: [{ "key": "owner", "name": "Egasi", "description": "...", "permissions": [...] }, ...]
-- (src/lib/permissions.ts → SYSTEM_ROLE_PERMISSIONS). Egasi roli doim '*'.
create or replace function public.register_organization(
  p_org_name text,
  p_owner_name text,
  p_branch_name text,
  p_roles jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_branch uuid;
  v_owner_role uuid;
  v_staff uuid;
  v_role jsonb;
  v_card uuid;
  v_pipeline uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from auth.users where id = v_uid and phone_confirmed_at is not null) then
    raise exception 'phone_not_confirmed' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_org_name), '') = '' or coalesce(trim(p_owner_name), '') = ''
     or coalesce(trim(p_branch_name), '') = '' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  -- Suiiste'molga qarshi oddiy cheklov
  if (select count(*) from staff s join roles r on r.id = s.role_id
       where s.user_id = v_uid and r.system_key = 'owner') >= 5 then
    raise exception 'too_many_organizations' using errcode = 'P0001';
  end if;

  insert into organizations (name, slug)
  values (trim(p_org_name), 'c' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 11))
  returning id into v_org;

  insert into branches (organization_id, name) values (v_org, trim(p_branch_name))
  returning id into v_branch;

  for v_role in select * from jsonb_array_elements(p_roles) loop
    insert into roles (organization_id, name, description, is_system, system_key, permissions)
    values (
      v_org,
      v_role ->> 'name',
      v_role ->> 'description',
      true,
      v_role ->> 'key',
      case when v_role ->> 'key' = 'owner' then array['*']
           else array(select p from jsonb_array_elements_text(v_role -> 'permissions') p where p <> '*')
      end
    );
  end loop;

  select id into v_owner_role from roles where organization_id = v_org and system_key = 'owner';
  if v_owner_role is null then
    raise exception 'owner_role_missing' using errcode = 'P0001';
  end if;

  insert into profiles (id, full_name, phone)
  select u.id, trim(p_owner_name), '+' || ltrim(u.phone, '+') from auth.users u where u.id = v_uid
  on conflict (id) do update set full_name = excluded.full_name;

  insert into staff (organization_id, user_id, role_id, all_branches)
  values (v_org, v_uid, v_owner_role, true)
  returning id into v_staff;
  insert into staff_branches (staff_id, branch_id) values (v_staff, v_branch);

  -- To'lov turlari
  insert into payment_methods (organization_id, kind, name) values (v_org, 'cash', 'Naqd');
  insert into payment_methods (organization_id, kind, name) values (v_org, 'card', 'Karta')
  returning id into v_card;
  insert into payment_methods (organization_id, parent_id, kind, name) values
    (v_org, v_card, 'card', 'Uzcard'),
    (v_org, v_card, 'card', 'Humo');
  insert into payment_methods (organization_id, kind, name) values
    (v_org, 'terminal', 'Terminal'),
    (v_org, 'bank', 'Bank o''tkazmasi');

  -- Xarajat turkumlari
  insert into expense_categories (organization_id, name, kind) values
    (v_org, 'Ijara', 'rent'),
    (v_org, 'Ish haqi', 'salary'),
    (v_org, 'Marketing', 'marketing'),
    (v_org, 'Soliqlar', 'tax'),
    (v_org, 'Kommunal xizmatlar', 'operating'),
    (v_org, 'Xo''jalik xarajatlari', 'operating'),
    (v_org, 'Egasiga (foydadan)', 'owner_draw');

  -- Sabablar
  insert into reasons (organization_id, kind, name) values
    (v_org, 'leave', 'Narx qimmat'),
    (v_org, 'leave', 'Vaqt to''g''ri kelmadi'),
    (v_org, 'leave', 'Ko''chib ketdi'),
    (v_org, 'leave', 'O''qishni tugatdi'),
    (v_org, 'leave', 'Boshqa'),
    (v_org, 'freeze', 'Kasallik'),
    (v_org, 'freeze', 'Safar'),
    (v_org, 'freeze', 'Boshqa'),
    (v_org, 'refund', 'Guruhdan chiqdi'),
    (v_org, 'refund', 'Ortiqcha to''lov'),
    (v_org, 'refund', 'Boshqa'),
    (v_org, 'void', 'Xato kiritildi'),
    (v_org, 'void', 'Boshqa'),
    (v_org, 'lead_lost', 'Narx qimmat'),
    (v_org, 'lead_lost', 'Javob bermadi'),
    (v_org, 'lead_lost', 'Boshqa markazni tanladi'),
    (v_org, 'lead_lost', 'Boshqa');

  -- "Asosiy" varonka
  insert into pipelines (organization_id, name, sort) values (v_org, 'Asosiy', 0)
  returning id into v_pipeline;
  insert into pipeline_stages (organization_id, pipeline_id, name, sort, is_won, is_lost) values
    (v_org, v_pipeline, 'Yangi lid', 1, false, false),
    (v_org, v_pipeline, 'Bog''lanildi', 2, false, false),
    (v_org, v_pipeline, 'Sinovga yozildi', 3, false, false),
    (v_org, v_pipeline, 'Sinovga keldi', 4, false, false),
    (v_org, v_pipeline, 'Talaba bo''ldi', 5, true, false),
    (v_org, v_pipeline, 'Yo''qotildi', 6, false, true);

  return v_org;
end $$;

revoke execute on function public.register_organization(text, text, text, jsonb) from public, anon;
grant execute on function public.register_organization(text, text, text, jsonb) to authenticated;

-- ---------- Xodimlar ----------
-- Telefon bo'yicha mavjud foydalanuvchini topish (hali hamkasb bo'lmagani uchun RLS'da ko'rinmaydi).
create or replace function public.find_profile_by_phone(p_org uuid, p_phone text)
returns table (id uuid, full_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not has_permission(p_org, 'settings.staff') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select p.id, p.full_name from profiles p where p.phone = p_phone;
end $$;

revoke execute on function public.find_profile_by_phone(uuid, text) from public, anon;
grant execute on function public.find_profile_by_phone(uuid, text) to authenticated;

-- Xodim + filiallarini bitta tranzaksiyada saqlash. SECURITY INVOKER — RLS va triggerlar amal qiladi.
-- p_staff_id null — yangi xodim (p_user_id kerak); aks holda mavjudini yangilash (p_user_id e'tiborsiz).
create or replace function public.save_staff(
  p_org uuid,
  p_role_id uuid,
  p_is_teacher boolean,
  p_all_branches boolean,
  p_branch_ids uuid[],
  p_user_id uuid default null,
  p_staff_id uuid default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  if p_staff_id is null then
    if p_user_id is null then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
    insert into staff (organization_id, user_id, role_id, is_teacher, all_branches)
    values (p_org, p_user_id, p_role_id, p_is_teacher, p_all_branches)
    returning id into v_id;
  else
    update staff
       set role_id = p_role_id, is_teacher = p_is_teacher, all_branches = p_all_branches
     where id = p_staff_id and organization_id = p_org
    returning id into v_id;
    if v_id is null then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    delete from staff_branches
     where staff_id = v_id and not (branch_id = any (coalesce(p_branch_ids, '{}')));
  end if;

  insert into staff_branches (staff_id, branch_id)
  select v_id, b from unnest(coalesce(p_branch_ids, '{}')) b
  on conflict do nothing;
  return v_id;
end $$;

revoke execute on function public.save_staff(uuid, uuid, boolean, boolean, uuid[], uuid, uuid) from public, anon;
grant execute on function public.save_staff(uuid, uuid, boolean, boolean, uuid[], uuid, uuid) to authenticated;

-- =====================================================================
-- Ustun darajasidagi huquqlar: foydalanuvchi tizim maydonlarini o'zgartira olmasin.
-- =====================================================================
revoke insert, update, delete on organizations from anon, authenticated;
grant update (name, logo_url, primary_color, work_start, work_end, settings) on organizations to authenticated;

revoke insert, update, delete on profiles from anon, authenticated;
grant update (full_name, must_change_password) on profiles to authenticated;

revoke update on roles from anon, authenticated;
grant update (name, description, permissions) on roles to authenticated;

revoke update on staff from anon, authenticated;
grant update (role_id, is_teacher, all_branches, is_active) on staff to authenticated;

revoke insert, update, delete on audit_log from anon, authenticated;

-- =====================================================================
-- RLS siyosatlari (schema.sql dagilarga qo'shimcha)
-- =====================================================================

-- organizations (o'qish: org_read, schema.sql)
create policy org_update on organizations for update
  using (has_permission(id, 'settings.organization'))
  with check (has_permission(id, 'settings.organization'));

-- profiles (o'zi: profile_self, schema.sql)
create policy profile_colleagues on profiles for select using (is_colleague(id));
create policy profile_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- branches
create policy branches_read on branches for select
  using (can_see_branch(organization_id, id) or has_permission(organization_id, 'settings.branches'));
create policy branches_insert on branches for insert
  with check (has_permission(organization_id, 'settings.branches'));
create policy branches_update on branches for update
  using (has_permission(organization_id, 'settings.branches'))
  with check (has_permission(organization_id, 'settings.branches'));

-- roles
create policy roles_read on roles for select using (is_member(organization_id));
create policy roles_insert on roles for insert
  with check (has_permission(organization_id, 'settings.roles'));
create policy roles_update on roles for update
  using (has_permission(organization_id, 'settings.roles'))
  with check (has_permission(organization_id, 'settings.roles'));
create policy roles_delete on roles for delete
  using (has_permission(organization_id, 'settings.roles') and not is_system);

-- staff (o'zining yozuvi ham ko'rinadi — nofaol bo'lsa ham, "kirish yo'q" xabari uchun)
create policy staff_read on staff for select
  using (is_member(organization_id) or user_id = auth.uid());
create policy staff_insert on staff for insert
  with check (has_permission(organization_id, 'settings.staff'));
create policy staff_update on staff for update
  using (has_permission(organization_id, 'settings.staff'))
  with check (has_permission(organization_id, 'settings.staff'));

-- staff_branches
create policy staff_branches_read on staff_branches for select
  using (is_member(staff_org(staff_id)));
create policy staff_branches_insert on staff_branches for insert
  with check (has_permission(staff_org(staff_id), 'settings.staff'));
create policy staff_branches_delete on staff_branches for delete
  using (has_permission(staff_org(staff_id), 'settings.staff'));

-- Ma'lumotnomalar: o'qish — markaz a'zolari; yozish — settings.catalogs
create policy courses_read on courses for select using (is_member(organization_id));
create policy courses_write on courses for all
  using (has_permission(organization_id, 'settings.catalogs'))
  with check (has_permission(organization_id, 'settings.catalogs'));

create policy rooms_read on rooms for select using (is_member(organization_id));
create policy rooms_write on rooms for all
  using (has_permission(organization_id, 'settings.catalogs'))
  with check (has_permission(organization_id, 'settings.catalogs'));

create policy reasons_read on reasons for select using (is_member(organization_id));
create policy reasons_write on reasons for all
  using (has_permission(organization_id, 'settings.catalogs'))
  with check (has_permission(organization_id, 'settings.catalogs'));

create policy tags_read on tags for select using (is_member(organization_id));
create policy tags_write on tags for all
  using (has_permission(organization_id, 'settings.catalogs'))
  with check (has_permission(organization_id, 'settings.catalogs'));

create policy holidays_read on holidays for select using (is_member(organization_id));
create policy holidays_write on holidays for all
  using (has_permission(organization_id, 'settings.catalogs'))
  with check (has_permission(organization_id, 'settings.catalogs'));

create policy payment_methods_read on payment_methods for select using (is_member(organization_id));
create policy payment_methods_write on payment_methods for all
  using (has_permission(organization_id, 'settings.catalogs'))
  with check (has_permission(organization_id, 'settings.catalogs'));

create policy expense_categories_read on expense_categories for select
  using (is_member(organization_id));
create policy expense_categories_write on expense_categories for all
  using (has_permission(organization_id, 'settings.catalogs'))
  with check (has_permission(organization_id, 'settings.catalogs'));

-- groups
create policy groups_read on groups for select
  using ((has_permission(organization_id, 'groups.view') and can_see_branch(organization_id, branch_id))
         or teacher_id = current_staff_id(organization_id));
create policy groups_insert on groups for insert
  with check (has_permission(organization_id, 'groups.create') and can_see_branch(organization_id, branch_id));
create policy groups_update on groups for update
  using (has_permission(organization_id, 'groups.update') and can_see_branch(organization_id, branch_id))
  with check (has_permission(organization_id, 'groups.update') and can_see_branch(organization_id, branch_id));
create policy groups_delete on groups for delete
  using (has_permission(organization_id, 'groups.delete') and can_see_branch(organization_id, branch_id));

-- lessons (ustoz mavzu/uy vazifasini 4-bosqichda yozadi)
create policy lessons_read on lessons for select using (can_see_group(organization_id, group_id));
create policy lessons_write on lessons for all
  using (has_permission(organization_id, 'groups.update') and can_see_group(organization_id, group_id))
  with check (has_permission(organization_id, 'groups.update') and can_see_group(organization_id, group_id));

-- students: students_read / students_insert / students_update (schema.sql)

create policy student_tags_read on student_tags for select
  using (exists (select 1 from students s where s.id = student_id
                  and can_see_student(s.organization_id, s.id)));
create policy student_tags_write on student_tags for all
  using (exists (select 1 from students s where s.id = student_id
                  and can_edit_student(s.organization_id, s.id)))
  with check (exists (select 1 from students s join tags t on t.organization_id = s.organization_id
                       where s.id = student_id and t.id = tag_id
                         and can_edit_student(s.organization_id, s.id)));

create policy student_notes_read on student_notes for select
  using (can_see_student(organization_id, student_id));
create policy student_notes_insert on student_notes for insert
  with check (can_edit_student(organization_id, student_id));

create policy enrollments_read on enrollments for select
  using (can_see_student(organization_id, student_id));
create policy enrollments_insert on enrollments for insert
  with check (can_edit_student(organization_id, student_id));
create policy enrollments_update on enrollments for update
  using (can_edit_student(organization_id, student_id))
  with check (can_edit_student(organization_id, student_id));

create policy freezes_read on freezes for select
  using (can_see_student(organization_id, enrollment_student(enrollment_id)));
create policy freezes_write on freezes for all
  using (can_edit_student(organization_id, enrollment_student(enrollment_id)))
  with check (can_edit_student(organization_id, enrollment_student(enrollment_id)));

create policy discounts_read on discounts for select
  using (can_see_student(organization_id, enrollment_student(enrollment_id)));
create policy discounts_write on discounts for all
  using (has_permission(organization_id, 'discounts.manage')
         and can_see_student(organization_id, enrollment_student(enrollment_id)))
  with check (has_permission(organization_id, 'discounts.manage')
              and can_see_student(organization_id, enrollment_student(enrollment_id)));

-- attendance: attendance_rw (schema.sql) + ko'rish
create policy attendance_read on attendance for select
  using (has_permission(organization_id, 'attendance.view')
         and exists (select 1 from lessons l where l.id = lesson_id
                      and can_see_group(organization_id, l.group_id)));

-- transactions: tx_read / tx_insert (schema.sql)

-- expenses (o'chirish = deleted_at, ya'ni update)
create policy expenses_read on expenses for select
  using (has_permission(organization_id, 'expenses.view') and can_see_branch(organization_id, branch_id));
create policy expenses_insert on expenses for insert
  with check (has_permission(organization_id, 'expenses.create') and can_see_branch(organization_id, branch_id));
create policy expenses_update on expenses for update
  using ((has_permission(organization_id, 'expenses.update') or has_permission(organization_id, 'expenses.delete'))
         and can_see_branch(organization_id, branch_id))
  with check ((has_permission(organization_id, 'expenses.update') or has_permission(organization_id, 'expenses.delete'))
              and can_see_branch(organization_id, branch_id));

-- cash_handovers
create policy cash_handovers_read on cash_handovers for select
  using ((has_permission(organization_id, 'cash.view') and can_see_branch(organization_id, branch_id))
         or from_staff_id = current_staff_id(organization_id)
         or to_staff_id = current_staff_id(organization_id));
create policy cash_handovers_insert on cash_handovers for insert
  with check (has_permission(organization_id, 'cash.handover')
              and from_staff_id = current_staff_id(organization_id)
              and can_see_branch(organization_id, branch_id));

-- salary
create policy salary_rules_read on salary_rules for select
  using (has_permission(organization_id, 'salary.view') or staff_id = current_staff_id(organization_id));
create policy salary_rules_write on salary_rules for all
  using (has_permission(organization_id, 'salary.manage'))
  with check (has_permission(organization_id, 'salary.manage'));

create policy salary_entries_read on salary_entries for select
  using (has_permission(organization_id, 'salary.view') or staff_id = current_staff_id(organization_id));
create policy salary_entries_write on salary_entries for all
  using (has_permission(organization_id, 'salary.manage'))
  with check (has_permission(organization_id, 'salary.manage'));

-- Sotuv
create policy pipelines_read on pipelines for select using (has_permission(organization_id, 'leads.view'));
create policy pipelines_write on pipelines for all
  using (has_permission(organization_id, 'leads.settings'))
  with check (has_permission(organization_id, 'leads.settings'));

create policy pipeline_stages_read on pipeline_stages for select
  using (has_permission(organization_id, 'leads.view'));
create policy pipeline_stages_write on pipeline_stages for all
  using (has_permission(organization_id, 'leads.settings'))
  with check (has_permission(organization_id, 'leads.settings'));

create policy leads_read on leads for select using (can_see_lead(organization_id, id));
create policy leads_insert on leads for insert
  with check (has_permission(organization_id, 'leads.create')
              and (branch_id is null or can_see_branch(organization_id, branch_id)));
create policy leads_update on leads for update
  using (has_permission(organization_id, 'leads.update') and can_see_lead(organization_id, id))
  with check (has_permission(organization_id, 'leads.update')
              and (branch_id is null or can_see_branch(organization_id, branch_id)));
create policy leads_delete on leads for delete
  using (has_permission(organization_id, 'leads.delete') and can_see_lead(organization_id, id));

create policy lead_activities_read on lead_activities for select
  using (can_see_lead(organization_id, lead_id));
create policy lead_activities_insert on lead_activities for insert
  with check (has_permission(organization_id, 'leads.update') and can_see_lead(organization_id, lead_id));

-- Aloqa
create policy telegram_group_links_read on telegram_group_links for select
  using (can_see_group(organization_id, group_id));
create policy telegram_group_links_write on telegram_group_links for all
  using (has_permission(organization_id, 'settings.integrations'))
  with check (has_permission(organization_id, 'settings.integrations'));

create policy message_log_read on message_log for select
  using (has_permission(organization_id, 'sms.view'));
create policy message_log_insert on message_log for insert
  with check (has_permission(organization_id, 'sms.send'));

-- audit_log: faqat o'qish; yozuvlar audit_row() triggeri orqali
create policy audit_log_read on audit_log for select
  using (has_permission(organization_id, 'audit.view'));

-- =====================================================================
-- Storage: markaz logolari (ommaviy o'qish, yozish — settings.organization).
-- SVG ruxsat etilmaydi: ichida skript bo'lishi mumkin.
-- Yo'l: org-assets/<organization_id>/<fayl>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('org-assets', 'org-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy org_assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'org-assets'
              and has_permission(try_uuid((storage.foldername(name))[1]), 'settings.organization'));
create policy org_assets_update on storage.objects for update to authenticated
  using (bucket_id = 'org-assets'
         and has_permission(try_uuid((storage.foldername(name))[1]), 'settings.organization'));
create policy org_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'org-assets'
         and has_permission(try_uuid((storage.foldername(name))[1]), 'settings.organization'));
