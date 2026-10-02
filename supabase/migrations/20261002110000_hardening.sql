-- Supabase security advisors bo'yicha tuzatishlar.

-- Trigger funksiyalari REST API (/rpc) orqali chaqirilmasin — triggerlar baribir ishlaydi.
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_phone_change() from public, anon, authenticated;
revoke execute on function public.staff_branches_guard() from public, anon, authenticated;
revoke execute on function public.roles_guard() from public, anon;
revoke execute on function public.staff_guard() from public, anon;

-- RLS yordamchilari: faqat kirgan foydalanuvchilar (siyosatlar ularni chaqiruvchi nomidan bajaradi).
do $$
declare
  f text;
begin
  foreach f in array array[
    'public.current_staff(uuid)',
    'public.is_member(uuid)',
    'public.has_permission(uuid, text)',
    'public.can_see_branch(uuid, uuid)',
    'public.current_staff_id(uuid)',
    'public.my_permissions(uuid)',
    'public.staff_org(uuid)',
    'public.is_colleague(uuid)',
    'public.can_see_group(uuid, uuid)',
    'public.can_see_student(uuid, uuid)',
    'public.can_edit_student(uuid, uuid)',
    'public.enrollment_student(uuid)',
    'public.can_see_lead(uuid, uuid)',
    'public.try_uuid(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

alter function public.try_uuid(text) set search_path = '';

create schema if not exists extensions;
alter extension btree_gist set schema extensions;
