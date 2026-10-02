"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { isSubset, normalizePermissions } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

import { type RoleValues, roleSchema } from "./schema";

export async function saveRole(input: RoleValues): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.roles");
    const values = parseInput(roleSchema, input);
    const orgId = ctx.membership.orgId;
    const permissions = normalizePermissions(values.permissions);
    const supabase = await createClient();

    // Bazadagi roles_guard bilan bir xil qoida: o'zida yo'q ruxsatni qo'shib bo'lmaydi.
    let previous: string[] = [];
    if (values.id) {
      const current = unwrap(
        await supabase
          .from("roles")
          .select("permissions, system_key")
          .eq("id", values.id)
          .eq("organization_id", orgId)
          .maybeSingle(),
      );
      if (!current) throw new ActionError("errors.notFound");
      if (current.system_key === "owner") throw new ActionError("errors.db.owner_role_locked");
      previous = current.permissions;
    }
    const added = permissions.filter((p) => !previous.includes(p));
    if (!isSubset(added, ctx.membership.permissions)) {
      throw new ActionError("errors.db.permission_escalation");
    }

    const row = { name: values.name, description: values.description || null, permissions };
    let id: string;
    if (values.id) {
      unwrap(
        await supabase.from("roles").update(row).eq("id", values.id).eq("organization_id", orgId),
      );
      id = values.id;
    } else {
      id = unwrap(
        await supabase
          .from("roles")
          .insert({ ...row, organization_id: orgId })
          .select("id")
          .single(),
      ).id;
    }
    revalidatePath("/", "layout");
    return { id };
  });
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.roles");
    const orgId = ctx.membership.orgId;
    const supabase = await createClient();

    const { count } = await supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("role_id", roleId);
    if (count) throw new ActionError("errors.roleInUse");

    const deleted = unwrap(
      await supabase
        .from("roles")
        .delete()
        .eq("id", roleId)
        .eq("organization_id", orgId)
        .select("id"),
    );
    // RLS tizim rollarini o'chirishga yo'l qo'ymaydi — 0 qator
    if (deleted.length !== 1) throw new ActionError("errors.db.system_role_delete");
    revalidatePath("/", "layout");
    return null;
  });
}
