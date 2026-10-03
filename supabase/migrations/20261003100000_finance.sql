-- 7-bosqich: xarajatlar, kassa ("Qo'limdagi pul"), ish haqi (PRD §3.6, tasdiqlangan A–M qoidalar).
-- Pul yozuvlari faqat RPC orqali (SECURITY DEFINER + aniq ruxsat tekshiruvi); to'g'ridan-to'g'ri yozish yopiq.
-- Har funksiyadan keyin darhol revoke/grant.

-- ---------------------------------------------------------------------
-- To'lov turlari: "Qo'lda qoladi" (D). null — turiga qarab: Naqd va Karta — ha; Terminal, Bank — yo'q.
-- ---------------------------------------------------------------------
alter table payment_methods add column in_hand boolean;

create or replace function public.method_in_hand(p_method uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(m.in_hand, m.kind in ('cash', 'card')) from payment_methods m where m.id = p_method
$$;
revoke execute on function public.method_in_hand(uuid) from public, anon;
grant execute on function public.method_in_hand(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Ish haqi yozuvlari: bekor qilish va pul berish ma'lumotlari
-- ---------------------------------------------------------------------
alter table salary_entries
  add column branch_id uuid references branches(id),
  add column paid_on date,
  add column voided_at timestamptz,
  add column voided_by uuid references staff(id),
  add column void_reason text;
create index on salary_entries (organization_id, staff_id, period);

-- ---------------------------------------------------------------------
-- Xarajatlar: kimning pulidan (G), ish haqiga bog'liqligi, savat
-- ---------------------------------------------------------------------
alter table expenses
  add column from_staff_id uuid references staff(id),            -- null — filial kassasidan
  add column salary_entry_id uuid references salary_entries(id),
  add column updated_at timestamptz,
  add column deleted_by uuid references staff(id),
  add column delete_reason text;
create index on expenses (organization_id, paid_at);
create unique index expenses_salary_entry_key on expenses (salary_entry_id) where salary_entry_id is not null;

-- ---------------------------------------------------------------------
-- Pul topshirish: sana va bekor qilish (F)
-- ---------------------------------------------------------------------
alter table cash_handovers
  add column handed_on date not null default ((now() at time zone 'Asia/Tashkent')::date),
  add column voided_at timestamptz,
  add column voided_by uuid references staff(id),
  add column void_reason text;
create index on cash_handovers (organization_id, handed_on);

-- To'g'ridan-to'g'ri yozish yopiladi — faqat quyidagi RPC'lar
drop policy expenses_insert on expenses;
drop policy expenses_update on expenses;
drop policy cash_handovers_insert on cash_handovers;
drop policy salary_entries_write on salary_entries;
revoke insert, update, delete on expenses from anon, authenticated;
revoke insert, update, delete on cash_handovers from anon, authenticated;
revoke insert, update, delete on salary_entries from anon, authenticated;

-- Audit (CLAUDE.md qoida 9)
create trigger audit_expenses after insert or update on expenses
  for each row execute function public.audit_row();
create trigger audit_cash_handovers after insert or update on cash_handovers
  for each row execute function public.audit_row();
create trigger audit_salary_rules after insert or update or delete on salary_rules
  for each row execute function public.audit_row();
create trigger audit_salary_entries after insert or update on salary_entries
  for each row execute function public.audit_row();
create trigger audit_expense_categories after insert or update or delete on expense_categories
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------
-- Ish haqi kelishuvlari: to'g'ridan-to'g'ri yoziladi (salary.manage, RLS), lekin shu tekshiruv bilan
-- ---------------------------------------------------------------------
create or replace function public.salary_rules_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from staff where id = new.staff_id and organization_id = new.organization_id) then
    raise exception 'salary_staff_mismatch' using errcode = 'P0001';
  end if;
  if new.group_id is not null
     and not exists (select 1 from groups where id = new.group_id and organization_id = new.organization_id) then
    raise exception 'salary_group_mismatch' using errcode = 'P0001';
  end if;
  if new.valid_to is not null and new.valid_to < new.valid_from then
    raise exception 'salary_rule_invalid' using errcode = 'P0001';
  end if;
  if (new.type = 'fixed_monthly' and (coalesce(new.amount, 0) <= 0 or new.group_id is not null or new.percent is not null))
     or (new.type = 'fixed_per_group' and (coalesce(new.amount, 0) <= 0 or new.group_id is null or new.percent is not null))
     or (new.type = 'per_lesson' and (coalesce(new.amount, 0) <= 0 or new.percent is not null))
     or (new.type = 'percent_of_revenue' and (new.percent is null or new.percent <= 0 or new.percent > 100
                                               or new.amount is not null)) then
    raise exception 'salary_rule_invalid' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.salary_rules_integrity() from public, anon, authenticated;
create trigger salary_rules_integrity before insert or update on salary_rules
  for each row execute function public.salary_rules_integrity();

-- ---------------------------------------------------------------------
-- Xarajat qo'shish / tahrirlash (A–C, G)
-- ---------------------------------------------------------------------
create or replace function public.save_expense(
  p_id uuid,
  p_branch uuid,
  p_category uuid,
  p_amount bigint,
  p_method uuid,
  p_paid_at date,
  p_recipient text,
  p_note text,
  p_from_kassa boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_old expenses%rowtype;
  v_staff uuid;
  v_id uuid;
begin
  select organization_id into v_org from branches where id = p_branch;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_id is not null then
    select * into v_old from expenses where id = p_id and organization_id = v_org;
    if v_old.id is null then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
  end if;
  if auth.uid() is not null and not (
       has_permission(v_org, case when p_id is null then 'expenses.create' else 'expenses.update' end)
       and can_see_branch(v_org, p_branch)
       and (p_id is null or can_see_branch(v_org, v_old.branch_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_old.deleted_at is not null then
    raise exception 'expense_deleted' using errcode = 'P0001';
  end if;
  if v_old.salary_entry_id is not null then
    raise exception 'expense_salary_linked' using errcode = 'P0001';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_paid_at is null or p_paid_at > today_tashkent() or p_paid_at < today_tashkent() - 366 then
    raise exception 'expense_date_invalid' using errcode = 'P0001';
  end if;
  if not exists (select 1 from expense_categories c where c.id = p_category and c.organization_id = v_org
                  and (c.is_active or c.id = v_old.category_id)) then
    raise exception 'expense_category_mismatch' using errcode = 'P0001';
  end if;
  if not exists (select 1 from payment_methods m where m.id = p_method and m.organization_id = v_org
                  and (m.is_active or m.id = v_old.method_id)) then
    raise exception 'tx_method_mismatch' using errcode = 'P0001';
  end if;
  v_staff := current_staff_id(v_org);

  if p_id is null then
    insert into expenses (organization_id, branch_id, category_id, amount, method_id, paid_at, recipient, note,
                          from_staff_id, created_by)
    values (v_org, p_branch, p_category, p_amount, p_method, p_paid_at,
            nullif(btrim(left(p_recipient, 200)), ''), nullif(btrim(left(p_note, 500)), ''),
            case when p_from_kassa then null else v_staff end, v_staff)
    returning id into v_id;
    return v_id;
  end if;

  update expenses
     set branch_id = p_branch, category_id = p_category, amount = p_amount, method_id = p_method,
         paid_at = p_paid_at, recipient = nullif(btrim(left(p_recipient, 200)), ''),
         note = nullif(btrim(left(p_note, 500)), ''),
         from_staff_id = case when p_from_kassa then null else coalesce(v_old.from_staff_id, v_staff) end,
         updated_at = now()
   where id = p_id;
  return p_id;
end $$;
revoke execute on function public.save_expense(uuid, uuid, uuid, bigint, uuid, date, text, text, boolean) from public, anon;
grant execute on function public.save_expense(uuid, uuid, uuid, bigint, uuid, date, text, text, boolean) to authenticated, service_role;

-- O'chirish (savatga) va qaytarish. Ish haqiga bog'liq xarajat — faqat ish haqi yozuvini bekor qilib (L).
create or replace function public.set_expense_deleted(p_id uuid, p_deleted boolean, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v expenses%rowtype;
begin
  select * into v from expenses where id = p_id;
  if v.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not (has_permission(v.organization_id, 'expenses.delete')
                                     and can_see_branch(v.organization_id, v.branch_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.salary_entry_id is not null then
    raise exception 'expense_salary_linked' using errcode = 'P0001';
  end if;
  if p_deleted then
    if v.deleted_at is not null then
      return;
    end if;
    update expenses set deleted_at = now(), deleted_by = current_staff_id(v.organization_id),
                        delete_reason = nullif(btrim(left(p_reason, 500)), '')
     where id = p_id;
  else
    update expenses set deleted_at = null, deleted_by = null, delete_reason = null, updated_at = now()
     where id = p_id and deleted_at is not null;
  end if;
end $$;
revoke execute on function public.set_expense_deleted(uuid, boolean, text) from public, anon;
grant execute on function public.set_expense_deleted(uuid, boolean, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Pul topshirish (F): xodim → boshqa xodim yoki filial kassasi. Bir bosqichli.
-- ---------------------------------------------------------------------
create or replace function public.handover_cash(
  p_branch uuid,
  p_to_staff uuid,
  p_method uuid,
  p_amount bigint,
  p_note text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_from uuid;
  v_id uuid;
begin
  select organization_id into v_org from branches where id = p_branch;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  v_from := current_staff_id(v_org);
  if v_from is null or not (has_permission(v_org, 'cash.handover') and can_see_branch(v_org, p_branch)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_to_staff is not null and (p_to_staff = v_from or not exists (
       select 1 from staff where id = p_to_staff and organization_id = v_org and is_active)) then
    raise exception 'handover_target_invalid' using errcode = 'P0001';
  end if;
  if not exists (select 1 from payment_methods where id = p_method and organization_id = v_org) then
    raise exception 'tx_method_mismatch' using errcode = 'P0001';
  end if;
  if not method_in_hand(p_method) then
    raise exception 'method_not_in_hand' using errcode = 'P0001';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  insert into cash_handovers (organization_id, branch_id, from_staff_id, to_staff_id, method_id, amount, note)
  values (v_org, p_branch, v_from, p_to_staff, p_method, p_amount, nullif(btrim(left(p_note, 500)), ''))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.handover_cash(uuid, uuid, uuid, bigint, text) from public, anon;
grant execute on function public.handover_cash(uuid, uuid, uuid, bigint, text) to authenticated, service_role;

-- Xato topshirishni bekor qilish: kassani boshqaruvchi (cash.view), sabab majburiy
create or replace function public.void_handover(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v cash_handovers%rowtype;
begin
  select * into v from cash_handovers where id = p_id;
  if v.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not (has_permission(v.organization_id, 'cash.view')
                                     and can_see_branch(v.organization_id, v.branch_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if v.voided_at is not null then
    raise exception 'already_voided' using errcode = 'P0001';
  end if;
  update cash_handovers set voided_at = now(), voided_by = current_staff_id(v.organization_id),
                            void_reason = left(btrim(p_reason), 500)
   where id = p_id;
end $$;
revoke execute on function public.void_handover(uuid, text) from public, anon;
grant execute on function public.void_handover(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Qo'limdagi pul (E, G): har egasi (xodim yoki filial kassasi) × to'lov turi bo'yicha.
-- Faqat "qo'lda qoladi" turlari. Bekor qilingan to'lov — qabul qilgan xodimdan kamayadi.
-- cash.view — ko'rinadigan filiallardagi hamma; aks holda (cash.handover) — faqat o'zi.
-- ---------------------------------------------------------------------
create or replace function public.cash_positions(p_org uuid, p_branch uuid, p_from date, p_to date)
returns table (staff_id uuid, kassa_branch_id uuid, method_id uuid, opening bigint, received bigint,
               spent bigint, handed_out bigint, handed_in bigint, closing bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
  v_only uuid;
begin
  perform assert_any_permission(p_org, array['cash.view', 'cash.handover']);
  if auth.uid() is not null and not has_permission(p_org, 'cash.view') then
    v_only := current_staff_id(p_org);
  end if;
  return query
  with ev as (
    -- to'lovlar (qabul qilgan xodim qo'liga)
    select t.created_by as holder, null::uuid as kassa, t.method_id as method, t.occurred_on as day,
           'received' as kind, t.amount
      from transactions t
     where t.organization_id = p_org and t.kind = 'payment' and t.created_by is not null
       and t.branch_id = any(v_br) and method_in_hand(t.method_id)
    union all
    -- bekor qilingan to'lovlar — asl qabul qilgan xodimdan, bekor qilingan kuni
    select o.created_by, null, o.method_id, v.occurred_on, 'received', v.amount
      from transactions v join transactions o on o.id = v.voids_id
     where v.organization_id = p_org and v.kind = 'void' and o.kind = 'payment' and o.created_by is not null
       and o.branch_id = any(v_br) and method_in_hand(o.method_id)
    union all
    -- xarajatlar (ish haqi ham) — xodim qo'lidan yoki filial kassasidan
    select e.from_staff_id, case when e.from_staff_id is null then e.branch_id end, e.method_id, e.paid_at,
           'spent', -e.amount
      from expenses e
     where e.organization_id = p_org and e.deleted_at is null and e.method_id is not null
       and e.branch_id = any(v_br) and method_in_hand(e.method_id)
    union all
    select h.from_staff_id, null, h.method_id, h.handed_on, 'out', -h.amount
      from cash_handovers h
     where h.organization_id = p_org and h.voided_at is null and h.branch_id = any(v_br)
    union all
    select h.to_staff_id, case when h.to_staff_id is null then h.branch_id end, h.method_id, h.handed_on,
           'in', h.amount
      from cash_handovers h
     where h.organization_id = p_org and h.voided_at is null and h.branch_id = any(v_br)
  )
  select ev.holder, ev.kassa, ev.method,
         coalesce(sum(ev.amount) filter (where ev.day < p_from), 0)::bigint,
         coalesce(sum(ev.amount) filter (where ev.day between p_from and p_to and ev.kind = 'received'), 0)::bigint,
         coalesce(-sum(ev.amount) filter (where ev.day between p_from and p_to and ev.kind = 'spent'), 0)::bigint,
         coalesce(-sum(ev.amount) filter (where ev.day between p_from and p_to and ev.kind = 'out'), 0)::bigint,
         coalesce(sum(ev.amount) filter (where ev.day between p_from and p_to and ev.kind = 'in'), 0)::bigint,
         coalesce(sum(ev.amount) filter (where ev.day <= p_to), 0)::bigint
    from ev
   where ev.day <= p_to
     and (v_only is null or ev.holder = v_only)
   group by ev.holder, ev.kassa, ev.method;
end $$;
revoke execute on function public.cash_positions(uuid, uuid, date, date) from public, anon;
grant execute on function public.cash_positions(uuid, uuid, date, date) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Ish haqi yozuvlari (K, L, M): bonus, jarima, oyga xos o'zgartirish, pul berish.
-- Pul berilganda "Ish haqi" turkumida xarajat avtomatik yaratiladi.
-- ---------------------------------------------------------------------
create or replace function public.add_salary_entry(
  p_staff uuid,
  p_period date,
  p_kind salary_entry_kind,
  p_amount bigint,
  p_note text,
  p_method uuid,
  p_branch uuid,
  p_from_kassa boolean,
  p_paid_on date
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_me uuid;
  v_id uuid;
  v_category uuid;
  v_name text;
begin
  select organization_id into v_org from staff where id = p_staff;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not has_permission(v_org, 'salary.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_period is null or extract(day from p_period) <> 1
     or p_period > date_trunc('month', today_tashkent())::date then
    raise exception 'salary_period_invalid' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount < 0 or (p_kind <> 'override' and p_amount = 0) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  v_me := current_staff_id(v_org);

  if p_kind = 'payout' then
    if p_branch is null or not exists (select 1 from branches where id = p_branch and organization_id = v_org)
       or (auth.uid() is not null and not can_see_branch(v_org, p_branch)) then
      raise exception 'branch_org_mismatch' using errcode = 'P0001';
    end if;
    if not exists (select 1 from payment_methods where id = p_method and organization_id = v_org and is_active) then
      raise exception 'tx_method_mismatch' using errcode = 'P0001';
    end if;
    if p_paid_on is null or p_paid_on > today_tashkent() or p_paid_on < today_tashkent() - 366 then
      raise exception 'expense_date_invalid' using errcode = 'P0001';
    end if;
    select id into v_category from expense_categories
     where organization_id = v_org and kind = 'salary' and is_active order by name limit 1;
    if v_category is null then
      raise exception 'no_salary_category' using errcode = 'P0001';
    end if;
  end if;

  -- Oyga xos o'zgartirish bitta: oldingisi bekor qilinadi
  if p_kind = 'override' then
    update salary_entries set voided_at = now(), voided_by = v_me, void_reason = 'replaced'
     where staff_id = p_staff and period = p_period and kind = 'override' and voided_at is null;
  end if;

  insert into salary_entries (organization_id, staff_id, period, kind, amount, method_id, note, created_by,
                              branch_id, paid_on)
  values (v_org, p_staff, p_period, p_kind, p_amount,
          case when p_kind = 'payout' then p_method end, nullif(btrim(left(p_note, 500)), ''), v_me,
          case when p_kind = 'payout' then p_branch end, case when p_kind = 'payout' then p_paid_on end)
  returning id into v_id;

  if p_kind = 'payout' then
    select p.full_name into v_name from staff s join profiles p on p.id = s.user_id where s.id = p_staff;
    insert into expenses (organization_id, branch_id, category_id, amount, method_id, paid_at, recipient, note,
                          from_staff_id, created_by, salary_entry_id)
    values (v_org, p_branch, v_category, p_amount, p_method, p_paid_on, v_name,
            'Ish haqi ' || to_char(p_period, 'YYYY-MM'),
            case when p_from_kassa then null else v_me end, v_me, v_id);
  end if;
  return v_id;
end $$;
revoke execute on function public.add_salary_entry(uuid, date, salary_entry_kind, bigint, text, uuid, uuid, boolean, date) from public, anon;
grant execute on function public.add_salary_entry(uuid, date, salary_entry_kind, bigint, text, uuid, uuid, boolean, date) to authenticated, service_role;

create or replace function public.void_salary_entry(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v salary_entries%rowtype;
  v_me uuid;
begin
  select * into v from salary_entries where id = p_id;
  if v.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not has_permission(v.organization_id, 'salary.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if v.voided_at is not null then
    raise exception 'already_voided' using errcode = 'P0001';
  end if;
  v_me := current_staff_id(v.organization_id);
  update salary_entries set voided_at = now(), voided_by = v_me, void_reason = left(btrim(p_reason), 500)
   where id = p_id;
  update expenses set deleted_at = now(), deleted_by = v_me, delete_reason = left(btrim(p_reason), 500)
   where salary_entry_id = p_id and deleted_at is null;
end $$;
revoke execute on function public.void_salary_entry(uuid, text) from public, anon;
grant execute on function public.void_salary_entry(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Ish haqi hisobi uchun ma'lumot (H, I, J): guruh × kun bo'yicha tushum va davomati belgilangan darslar.
-- Tushum — guruhga bog'langan to'lov qismlari (bekor qilinganlarsiz), to'lov sanasi bo'yicha.
-- salary.view bo'lmasa — faqat o'zi uchun (p_staff = o'zi).
-- ---------------------------------------------------------------------
create or replace function public.payroll_group_stats(p_org uuid, p_month date, p_staff uuid)
returns table (group_id uuid, group_name text, teacher_id uuid, day date, revenue bigint, marked_lessons integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_from date := date_trunc('month', p_month)::date;
  v_to date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
begin
  if auth.uid() is not null then
    if not is_member(p_org) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if not has_permission(p_org, 'salary.view')
       and (p_staff is null or p_staff is distinct from current_staff_id(p_org)) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;
  return query
  with gs as (
    select g.id, g.name, g.teacher_id from groups g
     where g.organization_id = p_org
       and (p_staff is null or g.teacher_id = p_staff
            or g.id in (select r.group_id from salary_rules r where r.staff_id = p_staff and r.group_id is not null))
  ),
  rev as (
    select e.group_id, t.occurred_on as day, sum(t.amount)::bigint as revenue
      from transactions t join enrollments e on e.id = t.enrollment_id
     where t.organization_id = p_org and t.kind = 'payment'
       and t.occurred_on between v_from and v_to
       and e.group_id in (select id from gs)
       and not exists (select 1 from transactions v where v.voids_id = t.id)
     group by 1, 2
  ),
  les as (
    select l.group_id, l.date as day, count(*)::integer as marked
      from lessons l
     where l.organization_id = p_org and l.status <> 'cancelled' and l.date between v_from and v_to
       and l.group_id in (select id from gs)
       and exists (select 1 from attendance a where a.lesson_id = l.id)
     group by 1, 2
  )
  select gs.id, gs.name, gs.teacher_id, d.day, coalesce(rev.revenue, 0)::bigint, coalesce(les.marked, 0)
    from gs
    join (select rev.group_id, rev.day from rev union select les.group_id, les.day from les) d on d.group_id = gs.id
    left join rev on rev.group_id = d.group_id and rev.day = d.day
    left join les on les.group_id = d.group_id and les.day = d.day;
end $$;
revoke execute on function public.payroll_group_stats(uuid, date, uuid) from public, anon;
grant execute on function public.payroll_group_stats(uuid, date, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Xarajatlar hisoboti (A): oy × filial × turkum, savatdagilarsiz. Sof foyda = tushum − (owner_draw'dan
-- tashqari hamma xarajat); ortgan pul = sof foyda − owner_draw (TS'da, lib/metrics/profit.ts).
-- ---------------------------------------------------------------------
create or replace function public.report_expenses(p_org uuid, p_branch uuid, p_from date, p_to date)
returns table (month text, branch_id uuid, category_id uuid, kind expense_kind, amount bigint, count integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
begin
  perform assert_any_permission(p_org, array['expenses.view', 'reports.finance']);
  return query
  select to_char(e.paid_at, 'YYYY-MM'), e.branch_id, e.category_id, c.kind, sum(e.amount)::bigint,
         count(*)::integer
    from expenses e join expense_categories c on c.id = e.category_id
   where e.organization_id = p_org and e.deleted_at is null
     and e.paid_at between p_from and p_to
     and e.branch_id = any(v_br)
   group by 1, 2, 3, 4
   order by 1, 2;
end $$;
revoke execute on function public.report_expenses(uuid, uuid, date, date) from public, anon;
grant execute on function public.report_expenses(uuid, uuid, date, date) to authenticated, service_role;
