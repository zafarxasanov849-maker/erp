"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

import { type BranchValues, branchSchema } from "./schema";

export async function saveBranch(input: BranchValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.branches");
    const values = parseInput(branchSchema, input);
    const orgId = ctx.membership.orgId;
    const supabase = await createClient();

    const phone = values.phone ? normalizePhone(values.phone) : null;
    const row = {
      name: values.name,
      address: values.address || null,
      phone: phone?.ok ? phone.phone : null,
      is_active: values.isActive,
    };

    if (values.id) {
      if (!values.isActive) {
        const active = unwrap(
          await supabase
            .from("branches")
            .select("id")
            .eq("organization_id", orgId)
            .eq("is_active", true)
            .neq("id", values.id),
        );
        if (active.length === 0) throw new ActionError("errors.lastBranch");
      }
      const updated = unwrap(
        await supabase
          .from("branches")
          .update(row)
          .eq("id", values.id)
          .eq("organization_id", orgId)
          .select("id"),
      );
      if (updated.length !== 1) throw new ActionError("errors.notFound");
    } else {
      unwrap(await supabase.from("branches").insert({ ...row, organization_id: orgId }));
    }

    revalidatePath("/", "layout");
    return null;
  });
}
