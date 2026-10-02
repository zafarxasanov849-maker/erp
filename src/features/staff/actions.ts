"use server";

import { revalidatePath } from "next/cache";

import {
  ActionError,
  type ActionResult,
  dbError,
  parseInput,
  runAction,
  unwrap,
} from "@/lib/action";
import { type OrgContext, requirePermission } from "@/lib/auth";
import { WILDCARD, hasPermission, isSubset } from "@/lib/permissions";
// Istisno (CLAUDE.md qoida 1): yangi foydalanuvchini faqat admin API yarata oladi.
// Faqat auth.admin.createUser/deleteUser uchun, requirePermission("settings.staff") dan keyin.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toE164 } from "@/lib/validation";

import {
  type StaffCreateValues,
  type StaffUpdateValues,
  staffCreateSchema,
  staffUpdateSchema,
} from "./schema";

/** Bazadagi staff_guard bilan bir xil: o'zida yo'q ruxsatlarni bera olmaydi. */
async function assertCanGrant(
  ctx: OrgContext,
  roleId: string,
  allBranches: boolean,
  changed: { role: boolean; allBranches: boolean },
) {
  const supabase = await createClient();
  const role = unwrap(
    await supabase
      .from("roles")
      .select("permissions")
      .eq("id", roleId)
      .eq("organization_id", ctx.membership.orgId)
      .maybeSingle(),
  );
  if (!role) throw new ActionError("validation.required", { roleId: "validation.required" });
  const mine = ctx.membership.permissions;
  if (changed.role && !isSubset(role.permissions, mine)) {
    throw new ActionError("errors.db.permission_escalation");
  }
  if (
    changed.allBranches &&
    allBranches &&
    !mine.includes(WILDCARD) &&
    !hasPermission(mine, "branches.all")
  ) {
    throw new ActionError("errors.db.permission_escalation");
  }
}

export async function addStaff(
  input: StaffCreateValues,
): Promise<ActionResult<{ existingUser: boolean }>> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.staff");
    const values = parseInput(staffCreateSchema, input);
    const orgId = ctx.membership.orgId;
    const phone = toE164(values.phone);
    await assertCanGrant(ctx, values.roleId, values.allBranches, { role: true, allBranches: true });

    const supabase = await createClient();
    const found = unwrap(
      await supabase.rpc("find_profile_by_phone", { p_org: orgId, p_phone: phone }),
    );

    let userId: string;
    let created = false;
    if (found[0]) {
      userId = found[0].id;
      const { count } = await supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("user_id", userId);
      if (count) throw new ActionError("errors.staffExists", { phone: "errors.staffExists" });
    } else {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.createUser({
        phone,
        password: values.tempPassword,
        phone_confirm: true,
        user_metadata: { full_name: values.fullName, must_change_password: true },
      });
      if (error || !data.user) {
        console.error("[staff] createUser", error);
        throw new ActionError(
          error?.code === "phone_exists" ? "errors.staffExists" : "errors.unexpected",
        );
      }
      userId = data.user.id;
      created = true;
    }

    const { error } = await supabase.rpc("save_staff", {
      p_org: orgId,
      p_user_id: userId,
      p_role_id: values.roleId,
      p_is_teacher: values.isTeacher,
      p_all_branches: values.allBranches,
      p_branch_ids: values.allBranches ? [] : values.branchIds,
    });
    if (error) {
      // Yangi yaratilgan, lekin xodim bo'lmay qolgan foydalanuvchini qoldirmaymiz.
      if (created) await createAdminClient().auth.admin.deleteUser(userId);
      throw dbError(error);
    }

    revalidatePath("/", "layout");
    return { existingUser: !created };
  });
}

export async function updateStaff(input: StaffUpdateValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.staff");
    const values = parseInput(staffUpdateSchema, input);
    const orgId = ctx.membership.orgId;
    const supabase = await createClient();

    const current = unwrap(
      await supabase
        .from("staff")
        .select("role_id, all_branches, is_active")
        .eq("id", values.id)
        .eq("organization_id", orgId)
        .maybeSingle(),
    );
    if (!current) throw new ActionError("errors.notFound");
    await assertCanGrant(ctx, values.roleId, values.allBranches, {
      role: current.role_id !== values.roleId,
      allBranches: !current.all_branches,
    });

    unwrap(
      await supabase.rpc("save_staff", {
        p_org: orgId,
        p_staff_id: values.id,
        p_role_id: values.roleId,
        p_is_teacher: values.isTeacher,
        p_all_branches: values.allBranches,
        p_branch_ids: values.allBranches ? [] : values.branchIds,
      }),
    );
    if (current.is_active !== values.isActive) {
      unwrap(
        await supabase
          .from("staff")
          .update({ is_active: values.isActive })
          .eq("id", values.id)
          .eq("organization_id", orgId),
      );
    }

    revalidatePath("/", "layout");
    return null;
  });
}
