"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toIsoDate } from "@/lib/validation";

import {
  type ExpenseCategoryValues,
  type ExpenseValues,
  expenseCategorySchema,
  expenseDeleteSchema,
  expenseSchema,
} from "./schema";

/** Xarajat qo'shish / tahrirlash — faqat save_expense RPC orqali (B, C, G). */
export async function saveExpense(input: ExpenseValues): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const v = parseInput(expenseSchema, input);
    await requirePermission(v.id ? "expenses.update" : "expenses.create");
    const supabase = await createClient();
    const id = unwrap(
      await supabase.rpc("save_expense", {
        p_id: (v.id || null) as string,
        p_branch: v.branchId,
        p_category: v.categoryId,
        p_amount: v.amount,
        p_method: v.methodId,
        p_paid_at: toIsoDate(v.paidAt),
        p_recipient: v.recipient ?? "",
        p_note: v.note ?? "",
        p_from_kassa: v.fromKassa,
      }),
    );
    revalidatePath("/", "layout");
    return { id };
  });
}

/** Savatga / savatdan (A–C: butunlay o'chirilmaydi) */
export async function setExpenseDeleted(
  input: { id: string; reason?: string },
  deleted: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("expenses.delete");
    const v = parseInput(expenseDeleteSchema, input);
    const supabase = await createClient();
    unwrap(
      await supabase.rpc("set_expense_deleted", {
        p_id: v.id,
        p_deleted: deleted,
        p_reason: v.reason ?? "",
      }),
    );
    revalidatePath("/", "layout");
    return null;
  });
}

/** Sozlamalar → Moliya: xarajat turkumi */
export async function saveExpenseCategory(input: ExpenseCategoryValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.catalogs");
    const v = parseInput(expenseCategorySchema, input);
    const supabase = await createClient();
    const row = { name: v.name, kind: v.kind, is_active: v.isActive };
    if (v.id) {
      unwrap(
        await supabase
          .from("expense_categories")
          .update(row)
          .eq("id", v.id)
          .eq("organization_id", ctx.membership.orgId),
      );
    } else {
      unwrap(
        await supabase
          .from("expense_categories")
          .insert({ ...row, organization_id: ctx.membership.orgId }),
      );
    }
    revalidatePath("/", "layout");
    return null;
  });
}

/** Sozlamalar → Moliya: to'lov turi "qo'lda qoladi"mi (D) */
export async function setMethodInHand(id: string, inHand: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.catalogs");
    const supabase = await createClient();
    unwrap(
      await supabase
        .from("payment_methods")
        .update({ in_hand: inHand })
        .eq("id", id)
        .eq("organization_id", ctx.membership.orgId),
    );
    revalidatePath("/", "layout");
    return null;
  });
}
