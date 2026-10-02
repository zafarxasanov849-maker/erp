import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export async function listStaff(orgId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("staff")
      .select(
        `id, user_id, is_teacher, all_branches, is_active, created_at,
         role:roles!staff_role_id_fkey ( id, name, system_key ),
         profile:profiles ( full_name, phone ),
         staff_branches ( branch_id )`,
      )
      .eq("organization_id", orgId)
      .order("is_active", { ascending: false })
      .order("created_at"),
  );
  return rows.map((s) => ({
    id: s.id,
    userId: s.user_id,
    fullName: s.profile?.full_name ?? "",
    phone: s.profile?.phone ?? null,
    roleId: s.role?.id ?? "",
    roleName: s.role?.name ?? "",
    isOwner: s.role?.system_key === "owner",
    isTeacher: s.is_teacher,
    allBranches: s.all_branches,
    isActive: s.is_active,
    branchIds: s.staff_branches.map((b) => b.branch_id),
  }));
}

export type StaffRow = Awaited<ReturnType<typeof listStaff>>[number];
