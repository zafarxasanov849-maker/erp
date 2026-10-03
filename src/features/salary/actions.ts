"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toIsoDate } from "@/lib/validation";

import {
  type SalaryEntryValues,
  type SalaryRuleValues,
  salaryEntrySchema,
  salaryRuleSchema,
  voidSalaryEntrySchema,
} from "./schema";

/** Kelishuv qo'shish / tahrirlash (M: salary.manage; RLS + salary_rules_integrity triggeri) */
export async function saveSalaryRule(input: SalaryRuleValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("salary.manage");
    const v = parseInput(salaryRuleSchema, input);
    const supabase = await createClient();
    const percent = v.type === "percent_of_revenue";
    const row = {
      staff_id: v.staffId,
      type: v.type,
      amount: percent ? null : (v.amount ?? null),
      percent: percent ? (v.percent ?? null) : null,
      group_id: v.type === "fixed_monthly" ? null : v.groupId || null,
      valid_from: toIsoDate(v.validFrom),
      valid_to: v.validTo ? toIsoDate(v.validTo) : null,
    };
    if (v.id) {
      unwrap(
        await supabase
          .from("salary_rules")
          .update(row)
          .eq("id", v.id)
          .eq("organization_id", ctx.membership.orgId),
      );
    } else {
      unwrap(
        await supabase
          .from("salary_rules")
          .insert({ ...row, organization_id: ctx.membership.orgId }),
      );
    }
    revalidatePath("/", "layout");
    return null;
  });
}

export async function deleteSalaryRule(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("salary.manage");
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("salary_rules")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("organization_id", ctx.membership.orgId);
    if (error) throw new ActionError("errors.unexpected");
    if (!count) throw new ActionError("errors.notFound");
    revalidatePath("/", "layout");
    return null;
  });
}

/** Bonus, jarima, oyga xos o'zgartirish, pul berish (K, L) — add_salary_entry RPC */
export async function addSalaryEntry(input: SalaryEntryValues): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("salary.manage");
    const v = parseInput(salaryEntrySchema, input);
    const supabase = await createClient();
    const payout = v.kind === "payout";
    unwrap(
      await supabase.rpc("add_salary_entry", {
        p_staff: v.staffId,
        p_period: `${v.month}-01`,
        p_kind: v.kind,
        p_amount: v.amount,
        p_note: v.note ?? "",
        p_method: (payout ? v.methodId : null) as string,
        p_branch: (payout ? v.branchId || null : null) as string,
        p_from_kassa: v.fromKassa,
        p_paid_on: (payout && v.paidOn ? toIsoDate(v.paidOn) : null) as string,
      }),
    );
    revalidatePath("/", "layout");
    return null;
  });
}

export async function voidSalaryEntry(input: {
  id: string;
  reason: string;
}): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("salary.manage");
    const v = parseInput(voidSalaryEntrySchema, input);
    const supabase = await createClient();
    unwrap(await supabase.rpc("void_salary_entry", { p_id: v.id, p_reason: v.reason }));
    revalidatePath("/", "layout");
    return null;
  });
}
