-- 5-bosqich: hisob-kitob va to'lovlar (PRD §5).
-- Yechish va tuzatishlarni (charge/adjustment) faqat server billing dvigateli yozadi (service role,
-- src/features/billing/engine.server.ts). To'lov va bekor qilish — faqat RPC orqali.
-- Har funksiyadan keyin darhol revoke/grant (anon uchun oraliq bo'lmasin).

-- ---------- transactions: yangi ustunlar ----------
alter table transactions
  add column occurred_on date not null default ((now() at time zone 'Asia/Tashkent')::date),
  -- Daftar: { month, basis: { base, full }, lessons: [{ d, p }], reason } (lib/billing/calc.ts)
  add column billing jsonb,
  -- Bitta to'lov bir nechta a'zolikka bo'linsa — umumiy belgi (chek, bekor qilish)
  add column payment_ref uuid,
  add column receipt_no bigint;

create index on transactions (enrollment_id);
create index on transactions (organization_id, occurred_on);
create index on transactions (organization_id, payment_ref) where payment_ref is not null;

-- To'g'ridan-to'g'ri yozish yo'q: to'lov — receive_payment(), bekor qilish — void_payment(),
-- yechish/tuzatish — server dvigateli. Tranzaksiya o'zgartirilmaydi va o'chirilmaydi.
drop policy if exists tx_insert on transactions;
revoke insert, update, delete on transactions from anon, authenticated;

-- Markaz bo'yicha hisoblagichlar (chek raqami)
create table org_counters (
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  value           bigint not null default 0,
  primary key (organization_id, name)
);
alter table org_counters enable row level security;
revoke all on org_counters from anon, authenticated;

create or replace function public.next_counter(p_org uuid, p_name text)
returns bigint language sql security definer set search_path = public as $$
  insert into org_counters (organization_id, name, value) values (p_org, p_name, 1)
  on conflict (organization_id, name) do update set value = org_counters.value + 1
  returning value
$$;
revoke execute on function public.next_counter(uuid, text) from public, anon, authenticated;
grant execute on function public.next_counter(uuid, text) to service_role;

-- ---------- Yaxlitlik ----------
create or replace function public.transactions_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from students where id = new.student_id and organization_id = new.organization_id) then
    raise exception 'tx_student_mismatch' using errcode = 'P0001';
  end if;
  if not exists (select 1 from branches where id = new.branch_id and organization_id = new.organization_id) then
    raise exception 'tx_branch_mismatch' using errcode = 'P0001';
  end if;
  if new.enrollment_id is not null and not exists (
    select 1 from enrollments where id = new.enrollment_id and student_id = new.student_id) then
    raise exception 'tx_enrollment_mismatch' using errcode = 'P0001';
  end if;
  if new.method_id is not null and not exists (
    select 1 from payment_methods where id = new.method_id and organization_id = new.organization_id) then
    raise exception 'tx_method_mismatch' using errcode = 'P0001';
  end if;
  if new.voids_id is not null and not exists (
    select 1 from transactions where id = new.voids_id and organization_id = new.organization_id) then
    raise exception 'tx_void_mismatch' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.transactions_integrity() from public, anon, authenticated;
create trigger transactions_integrity before insert on transactions
  for each row execute function public.transactions_integrity();

-- Pul harakati audit_log'ga: to'lov, bekor qilish, qaytarish (yechishlar daftarning o'zi)
create trigger audit_transactions after insert on transactions
  for each row when (new.kind in ('payment', 'void', 'refund'))
  execute function public.audit_row();

-- Chegirma: a'zolik shu markazda, bir a'zolikda chegirmalar kesishmaydi
create or replace function public.discounts_integrity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from enrollments where id = new.enrollment_id and organization_id = new.organization_id) then
    raise exception 'discount_enrollment_mismatch' using errcode = 'P0001';
  end if;
  if new.valid_to is not null and new.valid_to < new.valid_from then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if exists (
    select 1 from discounts d
     where d.enrollment_id = new.enrollment_id and d.id <> new.id
       and daterange(d.valid_from, d.valid_to, '[]') && daterange(new.valid_from, new.valid_to, '[]')) then
    raise exception 'discount_overlap' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.discounts_integrity() from public, anon, authenticated;
create trigger discounts_integrity before insert or update on discounts
  for each row execute function public.discounts_integrity();
create trigger audit_discounts after insert or update or delete on discounts
  for each row execute function public.audit_row();
create index on discounts (enrollment_id);

-- ---------- To'lov qabul qilish ----------
-- p_parts = [{ "enrollment_id": uuid | null, "amount": bigint }] — taqsimlash (§5.11) serverda hisoblanadi.
-- p_key — dialog ochilganda yaratiladi: ikki marta bosilsa ham bitta to'lov.
create or replace function public.receive_payment(
  p_student uuid,
  p_method uuid,
  p_paid_on date,
  p_note text,
  p_parts jsonb,
  p_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_s students%rowtype;
  v_ref uuid;
  v_no bigint;
  v_part jsonb;
  v_i integer := 0;
  v_existing record;
begin
  select * into v_s from students where id = p_student;
  if v_s.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not (has_permission(v_s.organization_id, 'payments.create')
                                     and can_see_student(v_s.organization_id, p_student)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Takror yuborilgan so'rov: avvalgi to'lovni qaytaramiz
  select payment_ref, receipt_no into v_existing from transactions
   where organization_id = v_s.organization_id and idempotency_key = 'payment:' || p_key || ':1';
  if found then
    return jsonb_build_object('payment_ref', v_existing.payment_ref, 'receipt_no', v_existing.receipt_no);
  end if;

  if p_paid_on is null or p_paid_on > today_tashkent() or p_paid_on < today_tashkent() - 366 then
    raise exception 'payment_date_invalid' using errcode = 'P0001';
  end if;
  if not exists (select 1 from payment_methods where id = p_method and organization_id = v_s.organization_id
                  and is_active) then
    raise exception 'tx_method_mismatch' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_parts) <> 'array' or jsonb_array_length(p_parts) = 0
     or exists (select 1 from jsonb_array_elements(p_parts) x where (x ->> 'amount')::bigint <= 0) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  v_ref := gen_random_uuid();
  v_no := next_counter(v_s.organization_id, 'receipt');
  for v_part in select * from jsonb_array_elements(p_parts) loop
    v_i := v_i + 1;
    insert into transactions (organization_id, branch_id, student_id, enrollment_id, kind, amount, method_id,
                              note, idempotency_key, payment_ref, receipt_no, occurred_on, created_by)
    values (v_s.organization_id, v_s.branch_id, p_student, (v_part ->> 'enrollment_id')::uuid, 'payment',
            (v_part ->> 'amount')::bigint, p_method, nullif(btrim(left(p_note, 500)), ''),
            'payment:' || p_key || ':' || v_i, v_ref, v_no, p_paid_on, current_staff_id(v_s.organization_id));
  end loop;
  return jsonb_build_object('payment_ref', v_ref, 'receipt_no', v_no);
end $$;
revoke execute on function public.receive_payment(uuid, uuid, date, text, jsonb, text) from public, anon;
grant execute on function public.receive_payment(uuid, uuid, date, text, jsonb, text) to authenticated, service_role;

-- ---------- To'lovni bekor qilish (§5.12): teskari yozuv, sabab majburiy ----------
create or replace function public.void_payment(p_payment_ref uuid, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_student uuid;
  v_count integer;
begin
  select organization_id, student_id into v_org, v_student from transactions
   where payment_ref = p_payment_ref and kind = 'payment' limit 1;
  if v_org is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if auth.uid() is not null and not (has_permission(v_org, 'payments.void')
                                     and can_see_student(v_org, v_student)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if exists (select 1 from transactions where payment_ref = p_payment_ref and kind = 'void') then
    raise exception 'already_voided' using errcode = 'P0001';
  end if;
  insert into transactions (organization_id, branch_id, student_id, enrollment_id, kind, amount, method_id,
                            note, voids_id, payment_ref, receipt_no, idempotency_key, created_by)
  select t.organization_id, t.branch_id, t.student_id, t.enrollment_id, 'void', -t.amount, t.method_id,
         left(btrim(p_reason), 500), t.id, t.payment_ref, t.receipt_no, 'void:' || t.id,
         current_staff_id(t.organization_id)
    from transactions t
   where t.payment_ref = p_payment_ref and t.kind = 'payment';
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.void_payment(uuid, text) from public, anon;
grant execute on function public.void_payment(uuid, text) to authenticated, service_role;

-- ---------- Balans (§5.10): eski qarz — joriy oy yechish va tuzatishlarisiz ----------
create or replace view public.student_balances with (security_invoker = true) as
select s.organization_id,
       s.id as student_id,
       coalesce(sum(t.amount), 0)::bigint as balance,
       least(0, coalesce(sum(t.amount), 0)
                - coalesce(sum(t.amount) filter (
                    where t.kind in ('charge', 'adjustment')
                      and t.billing ->> 'month' = to_char(today_tashkent(), 'YYYY-MM')), 0)
            )::bigint as old_debt
from students s
left join transactions t on t.student_id = s.id
group by s.organization_id, s.id;

-- Sinov muddati o'tganmi (§5.4): sinovdagi a'zolikda qo'shilgandan beri o'tgan (bekor qilinmagan) darslar
-- soni sozlamadagi sinov darslariga yetgan. Darslarni ko'rish huquqidan qat'i nazar (ustoz/admin).
create or replace function public.enrollment_trial_expired(p_enrollment uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select e.status = 'trial' and is_member(e.organization_id) and (
    select count(*) from lessons l
     where l.group_id = e.group_id and l.status <> 'cancelled'
       and l.date between e.joined_at and today_tashkent()
  ) >= org_setting_int(e.organization_id, 'trial_lessons', 2)
    from enrollments e where e.id = p_enrollment
$$;
revoke execute on function public.enrollment_trial_expired(uuid) from public, anon;
grant execute on function public.enrollment_trial_expired(uuid) to authenticated, service_role;

-- Talabalar ro'yxati: balans, eski qarz, sinov muddati o'tganmi (§5.4). Yangi ustunlar oxirida.
create or replace view public.students_overview with (security_invoker = true) as
select
  s.id,
  s.organization_id,
  s.branch_id,
  s.full_name,
  s.phone,
  s.parent_phone,
  s.joined_at,
  s.archived_at,
  s.created_at,
  case
    when s.archived_at is not null then 'archived'
    when bool_or(e.status = 'active') then 'active'
    when bool_or(e.status = 'trial') then 'trial'
    when bool_or(e.status = 'frozen') then 'frozen'
    when bool_or(e.status = 'left') then 'left'
    else 'new'
  end as status,
  coalesce(array_agg(distinct e.group_id) filter (where e.status <> 'left'), '{}') as group_ids,
  coalesce(array_agg(distinct g.course_id) filter (where e.status <> 'left' and g.id is not null), '{}') as course_ids,
  coalesce(array_agg(distinct g.teacher_id) filter (where e.status <> 'left' and g.teacher_id is not null), '{}') as teacher_ids,
  coalesce((select array_agg(st.tag_id) from student_tags st where st.student_id = s.id), '{}') as tag_ids,
  (select coalesce(sum(t.amount), 0)::bigint from transactions t where t.student_id = s.id) as balance,
  (select least(0, coalesce(sum(t.amount), 0)
                   - coalesce(sum(t.amount) filter (
                       where t.kind in ('charge', 'adjustment')
                         and t.billing ->> 'month' = to_char(today_tashkent(), 'YYYY-MM')), 0))::bigint
     from transactions t where t.student_id = s.id) as old_debt,
  coalesce(bool_or(e.status = 'trial' and enrollment_trial_expired(e.id)), false) as trial_expired
from students s
left join enrollments e on e.student_id = s.id
left join groups g on g.id = e.group_id
group by s.id;
