-- 6-bosqich: ko'rsatkichlar (PRD §6) — bitta joyda. Bosh sahifa ham, hisobotlar ham faqat shu
-- funksiyalardan o'qiydi. Hammasi SECURITY DEFINER + aniq ruxsat va filial tekshiruvi;
-- har funksiyadan keyin darhol revoke/grant.

-- Ko'rinadigan filiallar: p_branch berilsa — shu (ko'rish huquqi bo'lsa), aks holda hamma ko'rinadiganlar.
create or replace function public.metric_branches(p_org uuid, p_branch uuid)
returns uuid[] language plpgsql stable security definer set search_path = public as $$
begin
  if p_branch is not null then
    if auth.uid() is not null and not can_see_branch(p_org, p_branch) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    return array[p_branch];
  end if;
  return coalesce((select array_agg(b.id) from branches b
                    where b.organization_id = p_org and (auth.uid() is null or can_see_branch(p_org, b.id))),
                  '{}');
end $$;
revoke execute on function public.metric_branches(uuid, uuid) from public, anon;
grant execute on function public.metric_branches(uuid, uuid) to authenticated, service_role;

-- Ruxsat: berilgan ruxsatlardan biri bo'lsa
create or replace function public.assert_any_permission(p_org uuid, p_perms text[])
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return;
  end if;
  if not exists (select 1 from unnest(p_perms) p where has_permission(p_org, p)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;
revoke execute on function public.assert_any_permission(uuid, text[]) from public, anon;
grant execute on function public.assert_any_permission(uuid, text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Talaba holati berilgan kunda (PRD §6): faol > sinovdagi > muzlatilgan.
-- A'zolik o'sha kuni oxirida ochiq: qo'shilgan ≤ kun < chiqqan (chiqqan kuni ro'yxatdagi kabi "Chiqqan");
-- faollashgandan oldin — sinov; muzlatish kuni — muzlatilgan.
-- Ichki funksiya (to'g'ridan-to'g'ri chaqirilmaydi).
-- ---------------------------------------------------------------------
create or replace function public.student_states_at(p_org uuid, p_date date)
returns table (student_id uuid, branch_id uuid, state text)
language sql stable security definer set search_path = public as $$
  with es as (
    select e.student_id,
           case
             when e.activated_at is null or e.activated_at > p_date then 'trial'
             when exists (select 1 from freezes f where f.enrollment_id = e.id
                           and p_date between f.date_from and f.date_to) then 'frozen'
             else 'active'
           end as st
      from enrollments e
     where e.organization_id = p_org
       and e.joined_at <= p_date and (e.left_at is null or e.left_at > p_date)
  )
  select s.id, s.branch_id,
         case when bool_or(es.st = 'active') then 'active'
              when bool_or(es.st = 'trial') then 'trial'
              else 'frozen' end
    from es join students s on s.id = es.student_id
   group by s.id, s.branch_id
$$;
revoke execute on function public.student_states_at(uuid, date) from public, anon, authenticated;
grant execute on function public.student_states_at(uuid, date) to service_role;

-- Faol / sinovdagi / muzlatilgan talabalar soni berilgan kunda
create or replace function public.metric_students_at(p_org uuid, p_branch uuid, p_date date)
returns table (active integer, trial integer, frozen integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
begin
  perform assert_any_permission(p_org, array['students.view', 'reports.view']);
  return query
  select count(*) filter (where s.state = 'active')::integer,
         count(*) filter (where s.state = 'trial')::integer,
         count(*) filter (where s.state = 'frozen')::integer
    from student_states_at(p_org, p_date) s
   where s.branch_id = any(v_br);
end $$;
revoke execute on function public.metric_students_at(uuid, uuid, date) from public, anon;
grant execute on function public.metric_students_at(uuid, uuid, date) to authenticated, service_role;

-- Qarzdorlar (PRD §6): o'sha kuni faol talaba, o'sha kungacha balansi < 0. Ro'yxat — Qarzdorlar sahifasi
-- va bosh sahifa kartochkasi shu yerdan o'qiydi.
create or replace function public.metric_debtors(p_org uuid, p_branch uuid, p_date date)
returns table (student_id uuid, balance bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
begin
  perform assert_any_permission(p_org, array['payments.view', 'reports.finance']);
  return query
  select s.student_id, sum(t.amount)::bigint
    from student_states_at(p_org, p_date) s
    join transactions t on t.student_id = s.student_id and t.occurred_on <= p_date
   where s.state = 'active' and s.branch_id = any(v_br)
   group by s.student_id
  having sum(t.amount) < 0;
end $$;
revoke execute on function public.metric_debtors(uuid, uuid, date) from public, anon;
grant execute on function public.metric_debtors(uuid, uuid, date) to authenticated, service_role;

-- Tushum (PRD §6): davrdagi to'lovlar, bekor qilinganlarsiz; to'lov sanasi va qabul qilingan filial bo'yicha
create or replace function public.metric_revenue(p_org uuid, p_branch uuid, p_from date, p_to date)
returns table (revenue bigint, payers integer, payments integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
begin
  perform assert_any_permission(p_org, array['payments.view', 'reports.finance']);
  return query
  select coalesce(sum(t.amount), 0)::bigint,
         count(distinct t.student_id)::integer,
         count(distinct coalesce(t.payment_ref, t.id))::integer
    from transactions t
   where t.organization_id = p_org and t.kind = 'payment'
     and t.occurred_on between p_from and p_to
     and t.branch_id = any(v_br)
     and not exists (select 1 from transactions v where v.voids_id = t.id);
end $$;
revoke execute on function public.metric_revenue(uuid, uuid, date, date) from public, anon;
grant execute on function public.metric_revenue(uuid, uuid, date, date) to authenticated, service_role;

-- Ketganlar (tasdiqlangan C-qoida): davr ichida oxirgi guruhidan chiqqan va davr oxirida hech qaysi
-- guruhda qolmagan talaba. Boshqa guruhga o'tkazish ketish emas (yangi a'zolik ochiq qoladi).
create or replace function public.metric_left_students(p_org uuid, p_branch uuid, p_from date, p_to date)
returns table (student_id uuid, left_on date, reason text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
begin
  perform assert_any_permission(p_org, array['students.view', 'reports.view']);
  return query
  select s.id, last.left_at, last.reason
    from students s
    cross join lateral (
      select e.left_at, r.name as reason
        from enrollments e left join reasons r on r.id = e.leave_reason_id
       where e.student_id = s.id and e.left_at is not null
       order by e.left_at desc, e.created_at desc limit 1
    ) last
   where s.organization_id = p_org and s.branch_id = any(v_br)
     and last.left_at between p_from and p_to
     and not exists (select 1 from enrollments o where o.student_id = s.id
                      and o.joined_at <= p_to and (o.left_at is null or o.left_at > p_to));
end $$;
revoke execute on function public.metric_left_students(uuid, uuid, date, date) from public, anon;
grant execute on function public.metric_left_students(uuid, uuid, date, date) to authenticated, service_role;

-- Davomat (PRD §6): kataklar — o'tgan, bekor qilinmagan darslar × o'sha kuni a'zo va muzlatilmagan
-- talabalar. Bugungi dars tugaganidan keyin hisobga kiradi (kun davomida foizni tushirmasligi uchun).
-- Belgilangan % = belgilangan / kataklar; qatnashish % = (K + Kch) / belgilangan.
create or replace function public.report_attendance(p_org uuid, p_branch uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
  v_to date := least(p_to, today_tashkent());
begin
  perform assert_any_permission(p_org, array['reports.view', 'attendance.manage']);
  return (
    with cells as (
      select l.id as lesson_id, g.id as group_id, g.name as group_name, g.teacher_id, e.id as enrollment_id,
             e.student_id, a.status, a.late_marked
        from lessons l
        join groups g on g.id = l.group_id
        join enrollments e on e.group_id = g.id and e.joined_at <= l.date
                          and (e.left_at is null or e.left_at >= l.date)
        left join attendance a on a.lesson_id = l.id and a.enrollment_id = e.id
       where l.organization_id = p_org and g.branch_id = any(v_br)
         and l.status <> 'cancelled' and l.date between p_from and v_to
         and (l.date < today_tashkent() or l.end_time <= (now() at time zone 'Asia/Tashkent')::time)
         and not exists (select 1 from freezes f where f.enrollment_id = e.id
                          and l.date between f.date_from and f.date_to)
    ),
    agg as (
      select count(*) as cells, count(status) as marked,
             count(*) filter (where status = 'present') as present,
             count(*) filter (where status = 'late') as late,
             count(*) filter (where status = 'absent') as absent,
             count(*) filter (where status = 'excused') as excused,
             count(*) filter (where late_marked) as late_marked
        from cells
    )
    select jsonb_build_object(
      'totals', (select to_jsonb(agg) from agg),
      'groups', coalesce((
        select jsonb_agg(x order by x ->> 'name') from (
          select jsonb_build_object('id', group_id, 'name', group_name,
                   'teacher', (select p.full_name from staff st join profiles p on p.id = st.user_id
                                where st.id = c.teacher_id),
                   'cells', count(*), 'marked', count(status),
                   'present', count(*) filter (where status = 'present'),
                   'late', count(*) filter (where status = 'late'),
                   'absent', count(*) filter (where status = 'absent'),
                   'excused', count(*) filter (where status = 'excused'),
                   'late_marked', count(*) filter (where late_marked)) as x
            from cells c group by group_id, group_name, teacher_id) q), '[]'),
      'teachers', coalesce((
        select jsonb_agg(x order by x ->> 'name') from (
          select jsonb_build_object('id', teacher_id,
                   'name', coalesce((select p.full_name from staff st join profiles p on p.id = st.user_id
                                      where st.id = c.teacher_id), ''),
                   'cells', count(*), 'marked', count(status),
                   'present', count(*) filter (where status = 'present'),
                   'late', count(*) filter (where status = 'late'),
                   'absent', count(*) filter (where status = 'absent'),
                   'excused', count(*) filter (where status = 'excused'),
                   'late_marked', count(*) filter (where late_marked)) as x
            from cells c group by teacher_id) q), '[]'),
      'absent_students', coalesce((
        select jsonb_agg(x order by (x ->> 'absent')::int desc, x ->> 'name') from (
          select jsonb_build_object('id', c.student_id, 'name', s.full_name,
                   'absent', count(*) filter (where c.status = 'absent'), 'marked', count(c.status)) as x
            from cells c join students s on s.id = c.student_id
           group by c.student_id, s.full_name
          having count(*) filter (where c.status = 'absent') > 0
           order by count(*) filter (where c.status = 'absent') desc
           limit 20) q), '[]')
    )
  );
end $$;
revoke execute on function public.report_attendance(uuid, uuid, date, date) from public, anon;
grant execute on function public.report_attendance(uuid, uuid, date, date) to authenticated, service_role;

-- Moliya: oy × filial bo'yicha tushum (metric_revenue bilan bir xil ta'rif)
create or replace function public.report_finance(p_org uuid, p_branch uuid, p_from date, p_to date)
returns table (month text, branch_id uuid, revenue bigint, payers integer, payments integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
begin
  perform assert_any_permission(p_org, array['payments.view', 'reports.finance']);
  return query
  select to_char(t.occurred_on, 'YYYY-MM'), t.branch_id, sum(t.amount)::bigint,
         count(distinct t.student_id)::integer, count(distinct coalesce(t.payment_ref, t.id))::integer
    from transactions t
   where t.organization_id = p_org and t.kind = 'payment'
     and t.occurred_on between p_from and p_to
     and t.branch_id = any(v_br)
     and not exists (select 1 from transactions v where v.voids_id = t.id)
   group by 1, 2
   order by 1, 2;
end $$;
revoke execute on function public.report_finance(uuid, uuid, date, date) from public, anon;
grant execute on function public.report_finance(uuid, uuid, date, date) to authenticated, service_role;

-- Talabalar oqimi (oy bo'yicha): yangi, faollashgan, muzlatilgan, chiqqan (sabablar bilan), qaytgan.
-- Faollashgan — boshqa guruhga o'tkazishsiz; qaytgan — hamma guruhdan chiqib, kamida 14 kundan keyin
-- qayta yozilgan (tasdiqlangan D-qoida).
create or replace function public.report_student_flow(p_org uuid, p_branch uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_br uuid[] := metric_branches(p_org, p_branch);
begin
  perform assert_any_permission(p_org, array['students.view', 'reports.view']);
  return coalesce((
    select jsonb_agg(row order by row ->> 'month')
      from (
        select jsonb_build_object(
          'month', to_char(m.start, 'YYYY-MM'),
          'new', (select count(*) from students s
                   where s.organization_id = p_org and s.branch_id = any(v_br)
                     and s.joined_at between m.start and m.finish),
          'activated', (select count(distinct e.student_id) from enrollments e join students s on s.id = e.student_id
                         where e.organization_id = p_org and s.branch_id = any(v_br)
                           and e.activated_at between m.start and m.finish
                           and not exists (select 1 from enrollments t where t.student_id = e.student_id
                                            and t.id <> e.id and t.left_at = e.joined_at - 1
                                            and e.joined_at = e.activated_at)),
          'frozen', (select count(distinct e.student_id) from freezes f
                       join enrollments e on e.id = f.enrollment_id join students s on s.id = e.student_id
                      where f.organization_id = p_org and s.branch_id = any(v_br)
                        and f.date_from between m.start and m.finish),
          'left', (select count(*) from metric_left_students(p_org, p_branch, m.start, m.finish)),
          'left_reasons', coalesce((select jsonb_object_agg(coalesce(reason, ''), n) from (
                      select reason, count(*) as n from metric_left_students(p_org, p_branch, m.start, m.finish)
                       group by reason) r), '{}'),
          'returned', (select count(distinct e.student_id) from enrollments e join students s on s.id = e.student_id
                        where e.organization_id = p_org and s.branch_id = any(v_br)
                          and e.joined_at between m.start and m.finish
                          and exists (select 1 from enrollments p where p.student_id = e.student_id
                                       and p.id <> e.id and p.left_at is not null and p.left_at < e.joined_at)
                          and not exists (select 1 from enrollments p where p.student_id = e.student_id
                                           and p.id <> e.id and p.joined_at < e.joined_at
                                           and (p.left_at is null or p.left_at > e.joined_at - 14)))
        ) as row
        from (select greatest(gs::date, p_from) as start, least((gs + interval '1 month - 1 day')::date, p_to) as finish
                from generate_series(date_trunc('month', p_from), p_to, interval '1 month') gs) m
      ) q
  ), '[]');
end $$;
revoke execute on function public.report_student_flow(uuid, uuid, date, date) from public, anon;
grant execute on function public.report_student_flow(uuid, uuid, date, date) to authenticated, service_role;

-- Ustoz bosh sahifasi: o'z guruhlari, ulardagi talabalar (bugun), bugungi darslar va belgilanmaganlar
create or replace function public.teacher_summary(p_org uuid, p_date date)
returns table (groups integer, students integer, lessons integer, unmarked integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_staff uuid := current_staff_id(p_org);
begin
  if auth.uid() is not null and v_staff is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select (select count(*)::integer from groups g where g.organization_id = p_org and g.teacher_id = v_staff
                                                   and g.is_active),
         (select count(distinct e.student_id)::integer from enrollments e join groups g on g.id = e.group_id
           where g.organization_id = p_org and g.teacher_id = v_staff
             and e.joined_at <= p_date and (e.left_at is null or e.left_at > p_date)),
         (select count(*)::integer from lessons l join groups g on g.id = l.group_id
           where g.organization_id = p_org and g.teacher_id = v_staff and l.date = p_date and l.status <> 'cancelled'),
         (select count(*)::integer from lessons l join groups g on g.id = l.group_id
           where g.organization_id = p_org and g.teacher_id = v_staff and l.date = p_date and l.status <> 'cancelled'
             and not exists (select 1 from attendance a where a.lesson_id = l.id));
end $$;
revoke execute on function public.teacher_summary(uuid, date) from public, anon;
grant execute on function public.teacher_summary(uuid, date) to authenticated, service_role;
