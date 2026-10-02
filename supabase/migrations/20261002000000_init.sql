-- =====================================================================
-- O'quv markazlari CRM — boshlang'ich sxema (Postgres 15 / Supabase)
-- Ko'p ijarachili: har jadvalda organization_id + RLS.
-- Pul: bigint, butun so'mda. Vaqt zonasi: Asia/Tashkent.
-- Bu fayl 1-migratsiya uchun asos; Claude Code uni bo'laklarga bo'lishi mumkin.
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------- Enum turlar ----------
create type org_status        as enum ('trial', 'active', 'suspended');
create type gender            as enum ('male', 'female');
create type enrollment_status as enum ('trial', 'active', 'frozen', 'left');
create type lesson_status     as enum ('scheduled', 'held', 'cancelled');
create type attendance_status as enum ('present', 'late', 'absent', 'excused');
create type tx_kind           as enum ('payment', 'charge', 'refund', 'adjustment', 'void');
create type method_kind       as enum ('cash', 'card', 'terminal', 'bank', 'online');
create type expense_kind      as enum ('operating', 'salary', 'rent', 'marketing', 'tax', 'owner_draw');
create type salary_type       as enum ('fixed_monthly', 'fixed_per_group', 'percent_of_revenue', 'per_lesson');
create type salary_entry_kind as enum ('payout', 'bonus', 'penalty', 'override');
create type reason_kind       as enum ('leave', 'freeze', 'refund', 'void', 'lead_lost');

-- ---------- Markaz va filiallar ----------
create table organizations (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  slug                 text unique not null,
  logo_url             text,
  primary_color        text default '#2563eb',
  timezone             text not null default 'Asia/Tashkent',
  work_start           time default '08:00',
  work_end             time default '22:00',
  status               org_status not null default 'trial',
  plan                 text not null default 'trial',
  trial_ends_at        timestamptz default now() + interval '14 days',
  settings             jsonb not null default '{
    "trial_lessons": 2,
    "absence_threshold": 3,
    "teacher_edit_days": 2,
    "rounding": 1,
    "refund_on_leave": true
  }'::jsonb,
  created_at           timestamptz not null default now()
);

create table branches (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  address          text,
  phone            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index on branches (organization_id);

-- ---------- Foydalanuvchilar, rollar, xodimlar ----------
-- profiles.id = auth.users.id
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  phone             text unique,
  telegram_user_id  bigint unique,
  is_super_admin    boolean not null default false,
  created_at        timestamptz not null default now()
);

create table roles (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  description      text,
  is_system        boolean not null default false,  -- shablondan yaratilgan, o'chirib bo'lmaydi
  permissions      text[] not null default '{}',     -- masalan {'students.view','payments.create'}
  unique (organization_id, name)
);

create table staff (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  user_id          uuid not null references profiles(id) on delete cascade,
  role_id          uuid not null references roles(id),
  is_teacher       boolean not null default false,
  all_branches     boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table staff_branches (
  staff_id   uuid not null references staff(id) on delete cascade,
  branch_id  uuid not null references branches(id) on delete cascade,
  primary key (staff_id, branch_id)
);

-- ---------- Ma'lumotnomalar ----------
create table courses (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  monthly_price    bigint not null check (monthly_price >= 0),
  lesson_minutes   int default 90,
  is_active        boolean not null default true
);

create table rooms (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  branch_id        uuid not null references branches(id) on delete cascade,
  name             text not null,
  capacity         int
);

create table reasons (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  kind             reason_kind not null,
  name             text not null,
  is_active        boolean not null default true
);

create table tags (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  color            text,
  unique (organization_id, name)
);

create table holidays (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  branch_id        uuid references branches(id) on delete cascade,  -- null = butun markaz
  date             date not null,
  reason           text not null,
  created_by       uuid references staff(id),
  created_at       timestamptz not null default now()
);

create table payment_methods (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  parent_id        uuid references payment_methods(id),  -- Karta -> Uzcard, Humo, ...
  kind             method_kind not null,
  name             text not null,
  is_active        boolean not null default true
);

create table expense_categories (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  kind             expense_kind not null default 'operating',
  is_active        boolean not null default true
);

-- ---------- Guruhlar va darslar ----------
create table groups (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  branch_id        uuid not null references branches(id),
  course_id        uuid not null references courses(id),
  teacher_id       uuid references staff(id),
  room_id          uuid references rooms(id),
  name             text not null,
  monthly_price    bigint not null check (monthly_price >= 0),
  weekdays         smallint[] not null check (weekdays <@ array[1,2,3,4,5,6,7]::smallint[]), -- 1=Du ... 7=Ya
  start_time       time not null,
  end_time         time not null check (end_time > start_time),
  start_date       date not null,
  end_date         date,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index on groups (organization_id, branch_id);

create table lessons (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  group_id         uuid not null references groups(id) on delete cascade,
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  status           lesson_status not null default 'scheduled',
  cancel_reason    text,
  topic            text,
  homework         text,
  unique (group_id, date, start_time)
);
create index on lessons (organization_id, date);

-- ---------- Talabalar ----------
create table students (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  branch_id            uuid not null references branches(id),
  full_name            text not null,
  phone                text not null check (phone ~ '^\+998[0-9]{9}$'),
  gender               gender,
  birth_date           date,
  photo_url            text,
  parent_name          text,
  parent_phone         text check (parent_phone is null or parent_phone ~ '^\+998[0-9]{9}$'),
  parent_telegram_id   bigint,           -- ota-ona botni ishga tushirganda to'ladi
  telegram_username    text,
  address              text,
  school               text,
  passport_series      text,
  joined_at            date not null default current_date,
  user_id              uuid references profiles(id),   -- o'quvchi kabineti
  archived_at          timestamptz,
  created_at           timestamptz not null default now()
);
create index on students (organization_id, branch_id);
create index on students (organization_id, phone);

create table student_tags (
  student_id  uuid not null references students(id) on delete cascade,
  tag_id      uuid not null references tags(id) on delete cascade,
  primary key (student_id, tag_id)
);

create table student_notes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  student_id       uuid not null references students(id) on delete cascade,
  body             text not null,
  created_by       uuid references staff(id),
  created_at       timestamptz not null default now()
);

-- Talaba x Guruh
create table enrollments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  student_id       uuid not null references students(id) on delete cascade,
  group_id         uuid not null references groups(id),
  status           enrollment_status not null default 'trial',
  price_override   bigint check (price_override >= 0),
  joined_at        date not null default current_date,
  activated_at     date,
  left_at          date,
  leave_reason_id  uuid references reasons(id),
  created_at       timestamptz not null default now()
);
-- bitta talaba bitta guruhda bir vaqtda faqat bitta ochiq a'zolik
create unique index enrollments_open_uniq on enrollments (student_id, group_id) where status <> 'left';
create index on enrollments (organization_id, group_id);

create table freezes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  enrollment_id    uuid not null references enrollments(id) on delete cascade,
  date_from        date not null,
  date_to          date not null check (date_to >= date_from),
  reason_id        uuid references reasons(id),
  created_by       uuid references staff(id),
  created_at       timestamptz not null default now()
);

create table discounts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  enrollment_id    uuid not null references enrollments(id) on delete cascade,
  percent          numeric(5,2) check (percent between 0 and 100),
  amount           bigint check (amount >= 0),
  valid_from       date not null,
  valid_to         date,
  reason           text,
  check ((percent is null) <> (amount is null))
);

-- ---------- Davomat ----------
create table attendance (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  lesson_id        uuid not null references lessons(id) on delete cascade,
  enrollment_id    uuid not null references enrollments(id) on delete cascade,
  status           attendance_status not null,
  note             text,
  marked_by        uuid references staff(id),
  marked_at        timestamptz not null default now(),
  late_marked      boolean not null default false,  -- dars kunidan keyin belgilangan
  edited_after     boolean not null default false,  -- keyin tahrirlangan
  unique (lesson_id, enrollment_id)
);

-- ---------- Pul ----------
-- Musbat amount = talaba foydasiga (to'lov, qaytarish), manfiy = yechish.
create table transactions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  branch_id        uuid not null references branches(id),
  student_id       uuid not null references students(id),
  enrollment_id    uuid references enrollments(id),
  kind             tx_kind not null,
  amount           bigint not null check (amount <> 0),
  method_id        uuid references payment_methods(id),       -- faqat payment/refund
  period_start     date,
  period_end       date,
  lessons_count    int,
  note             text,
  idempotency_key  text,
  voids_id         uuid references transactions(id),          -- kind='void' bo'lsa qaysi biri bekor qilindi
  external_ref     text,                                      -- kelajakda Payme/Click id
  created_by       uuid references staff(id),                 -- null = tizim (cron)
  created_at       timestamptz not null default now(),
  check (kind not in ('payment', 'refund') or method_id is not null),
  unique (organization_id, idempotency_key)
);
create index on transactions (organization_id, student_id);
create index on transactions (organization_id, created_at);

create view student_balances with (security_invoker = true) as
select s.organization_id,
       s.id as student_id,
       coalesce(sum(t.amount), 0)::bigint as balance,
       least(0, coalesce(sum(t.amount), 0)
                - coalesce(sum(t.amount) filter (
                    where t.kind = 'charge'
                      and t.period_start >= date_trunc('month', (now() at time zone 'Asia/Tashkent'))::date), 0)
            )::bigint as old_debt
from students s
left join transactions t on t.student_id = s.id
group by s.organization_id, s.id;

create table expenses (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  branch_id        uuid not null references branches(id),
  category_id      uuid not null references expense_categories(id),
  amount           bigint not null check (amount > 0),
  method_id        uuid references payment_methods(id),
  paid_at          date not null default current_date,
  recipient        text,
  note             text,
  created_by       uuid references staff(id),
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

-- Xodim qo'lidagi pulni topshirish ("Qo'limdagi pul")
create table cash_handovers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  branch_id        uuid not null references branches(id),
  from_staff_id    uuid not null references staff(id),
  to_staff_id      uuid references staff(id),   -- null = filial kassasi
  method_id        uuid not null references payment_methods(id),
  amount           bigint not null check (amount > 0),
  note             text,
  created_at       timestamptz not null default now()
);

-- ---------- Ish haqi ----------
create table salary_rules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  staff_id         uuid not null references staff(id) on delete cascade,
  group_id         uuid references groups(id),   -- fixed_per_group / per_lesson uchun
  type             salary_type not null,
  amount           bigint,
  percent          numeric(5,2),
  valid_from       date not null,
  valid_to         date
);

create table salary_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  staff_id         uuid not null references staff(id) on delete cascade,
  period           date not null check (extract(day from period) = 1),  -- oyning 1-kuni
  kind             salary_entry_kind not null,
  amount           bigint not null,
  method_id        uuid references payment_methods(id),
  note             text,
  created_by       uuid references staff(id),
  created_at       timestamptz not null default now()
);

-- ---------- Sotuv ----------
create table pipelines (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  sort             int not null default 0
);

create table pipeline_stages (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  pipeline_id      uuid not null references pipelines(id) on delete cascade,
  name             text not null,
  sort             int not null,
  is_won           boolean not null default false,
  is_lost          boolean not null default false
);

create table leads (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  branch_id        uuid references branches(id),
  pipeline_id      uuid not null references pipelines(id),
  stage_id         uuid not null references pipeline_stages(id),
  full_name        text not null,
  phone            text,
  source           text not null default 'manual',  -- manual, web_form, telegram, facebook
  course_id        uuid references courses(id),
  assigned_to      uuid references staff(id),
  next_action_at   timestamptz,
  lost_reason_id   uuid references reasons(id),
  student_id       uuid references students(id),    -- talabaga aylangach
  created_at       timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);
create index on leads (organization_id, pipeline_id, stage_id);

create table lead_activities (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  lead_id          uuid not null references leads(id) on delete cascade,
  type             text not null,   -- note, call, stage_change, sms
  body             text,
  created_by       uuid references staff(id),
  created_at       timestamptz not null default now()
);

-- ---------- Aloqa ----------
create table telegram_group_links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  group_id         uuid not null references groups(id) on delete cascade,
  chat_id          bigint not null unique,
  connected_at     timestamptz not null default now()
);

create table message_log (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  channel          text not null,          -- sms, telegram_group, telegram_private
  recipient        text not null,
  student_id       uuid references students(id),
  template         text,
  body             text not null,
  status           text not null default 'queued',  -- queued, sent, failed
  error            text,
  created_at       timestamptz not null default now()
);

-- ---------- Audit ----------
create table audit_log (
  id               bigint generated always as identity primary key,
  organization_id  uuid not null references organizations(id) on delete cascade,
  actor_id         uuid references profiles(id),
  action           text not null,          -- payment.void, attendance.edit, role.update ...
  entity           text not null,
  entity_id        uuid,
  diff             jsonb,
  created_at       timestamptz not null default now()
);
create index on audit_log (organization_id, created_at desc);

-- =====================================================================
-- RLS yordamchi funksiyalari
-- =====================================================================
create or replace function current_staff(org uuid)
returns staff language sql stable security definer set search_path = public as $$
  select * from staff where organization_id = org and user_id = auth.uid() and is_active limit 1
$$;

create or replace function is_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where organization_id = org and user_id = auth.uid() and is_active)
$$;

create or replace function has_permission(org uuid, perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s join roles r on r.id = s.role_id
    where s.organization_id = org and s.user_id = auth.uid() and s.is_active
      and (perm = any (r.permissions) or '*' = any (r.permissions))
  )
$$;

create or replace function can_see_branch(org uuid, br uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s
    where s.organization_id = org and s.user_id = auth.uid() and s.is_active
      and (s.all_branches or exists (select 1 from staff_branches sb where sb.staff_id = s.id and sb.branch_id = br))
  )
$$;

-- =====================================================================
-- RLS: hamma jadvalda yoqiladi. Asosiy qoida — markaz a'zosi o'z markazini ko'radi;
-- yozish ruxsat bilan. Quyida namunalar; qolgan jadvallar shu andozada.
-- =====================================================================
alter table organizations      enable row level security;
alter table branches           enable row level security;
alter table profiles           enable row level security;
alter table roles              enable row level security;
alter table staff              enable row level security;
alter table staff_branches     enable row level security;
alter table courses            enable row level security;
alter table rooms              enable row level security;
alter table reasons            enable row level security;
alter table tags               enable row level security;
alter table holidays           enable row level security;
alter table payment_methods    enable row level security;
alter table expense_categories enable row level security;
alter table groups             enable row level security;
alter table lessons            enable row level security;
alter table students           enable row level security;
alter table student_tags       enable row level security;
alter table student_notes      enable row level security;
alter table enrollments        enable row level security;
alter table freezes            enable row level security;
alter table discounts          enable row level security;
alter table attendance         enable row level security;
alter table transactions       enable row level security;
alter table expenses           enable row level security;
alter table cash_handovers     enable row level security;
alter table salary_rules       enable row level security;
alter table salary_entries     enable row level security;
alter table pipelines          enable row level security;
alter table pipeline_stages    enable row level security;
alter table leads              enable row level security;
alter table lead_activities    enable row level security;
alter table telegram_group_links enable row level security;
alter table message_log        enable row level security;
alter table audit_log          enable row level security;

create policy org_read on organizations for select using (is_member(id));
create policy profile_self on profiles for select using (id = auth.uid());

create policy students_read on students for select
  using (has_permission(organization_id, 'students.view') and can_see_branch(organization_id, branch_id));
create policy students_insert on students for insert
  with check (has_permission(organization_id, 'students.create') and can_see_branch(organization_id, branch_id));
create policy students_update on students for update
  using (has_permission(organization_id, 'students.update') and can_see_branch(organization_id, branch_id));

create policy tx_read on transactions for select
  using (has_permission(organization_id, 'payments.view') and can_see_branch(organization_id, branch_id));
create policy tx_insert on transactions for insert
  with check (has_permission(organization_id, 'payments.create') and can_see_branch(organization_id, branch_id)
              and kind in ('payment', 'refund', 'void'));
-- charge/adjustment faqat server (service role, cron) yozadi. UPDATE va DELETE siyosati yo'q = taqiqlangan.

-- Ustoz faqat o'z guruhlarining davomatini yozadi
create policy attendance_rw on attendance for all
  using (
    has_permission(organization_id, 'attendance.manage')
    or exists (select 1 from lessons l join groups g on g.id = l.group_id
               where l.id = lesson_id and g.teacher_id = (current_staff(attendance.organization_id)).id)
  );

-- TODO (Claude Code): qolgan jadvallar uchun select/insert/update siyosatlarini shu andozada yozing
-- va har biri uchun pgTAP yoki SQL testi qo'shing: boshqa markaz foydalanuvchisi 0 qator ko'rishi kerak.
