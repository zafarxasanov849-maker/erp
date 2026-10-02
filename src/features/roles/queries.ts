import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export async function listRoles(orgId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("roles")
      .select(
        "id, name, description, is_system, system_key, permissions, staff:staff!staff_role_id_fkey(count)",
      )
      .eq("organization_id", orgId)
      .order("is_system", { ascending: false })
      .order("name"),
  );
  return rows.map(({ staff, ...r }) => ({ ...r, staffCount: staff[0]?.count ?? 0 }));
}

export type RoleRow = Awaited<ReturnType<typeof listRoles>>[number];

export async function getRole(orgId: string, roleId: string) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("roles")
      .select("id, name, description, is_system, system_key, permissions")
      .eq("organization_id", orgId)
      .eq("id", roleId)
      .maybeSingle(),
  );
}
