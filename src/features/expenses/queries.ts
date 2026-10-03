import "server-only";

import { methodNames } from "@/features/billing/queries";
import { unwrap } from "@/lib/action";
import type { IsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

import type { ExpenseKind } from "./schema";

export async function getExpenseCategories(orgId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("expense_categories")
      .select("id, name, kind, is_active")
      .eq("organization_id", orgId)
      .order("name"),
  );
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind as ExpenseKind,
    isActive: c.is_active,
  }));
}
export type ExpenseCategory = Awaited<ReturnType<typeof getExpenseCategories>>[number];

/** To'lov turlari (xarajat uchun ham) — "qo'lda qoladi" belgisi bilan (D) */
export async function getMethodsWithHand(orgId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("payment_methods")
      .select("id, name, kind, parent_id, is_active, in_hand")
      .eq("organization_id", orgId)
      .order("name"),
  );
  const names = new Map(rows.map((r) => [r.id, r.name]));
  const parents = new Set(rows.map((r) => r.parent_id).filter(Boolean));
  const order = ["cash", "card", "terminal", "bank", "online"];
  return rows
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.parent_id ? `${names.get(r.parent_id) ?? ""} · ${r.name}` : r.name,
      isActive: r.is_active,
      isParent: parents.has(r.id),
      inHandSetting: r.in_hand,
      inHand: r.in_hand ?? (r.kind === "cash" || r.kind === "card"),
    }))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
}
export type MethodWithHand = Awaited<ReturnType<typeof getMethodsWithHand>>[number];

/** Xarajatlar ro'yxati (savatdagilar alohida). Ruxsat va filial — RLS (expenses_read). */
export async function listExpenses(
  orgId: string,
  branchId: string | null,
  from: IsoDate,
  to: IsoDate,
  deleted: boolean,
) {
  const supabase = await createClient();
  let q = supabase
    .from("expenses")
    .select(
      `id, branch_id, amount, paid_at, recipient, note, method_id, created_at, deleted_at, delete_reason,
       salary_entry_id, from_staff_id, category_id,
       category:expense_categories ( name, kind ),
       author:staff!expenses_created_by_fkey ( profile:profiles ( full_name ) ),
       holder:staff!expenses_from_staff_id_fkey ( profile:profiles ( full_name ) )`,
    )
    .eq("organization_id", orgId)
    .gte("paid_at", from)
    .lte("paid_at", to)
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3000);
  q = deleted ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
  if (branchId) q = q.eq("branch_id", branchId);
  const rows = unwrap(await q);
  const methods = await methodNames(rows.map((r) => r.method_id));
  return rows.map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    amount: r.amount,
    paidAt: r.paid_at,
    recipient: r.recipient,
    note: r.note,
    methodId: r.method_id,
    methodName: r.method_id ? (methods.get(r.method_id) ?? "") : "",
    categoryId: r.category_id,
    categoryName: r.category?.name ?? "",
    kind: (r.category?.kind ?? "operating") as ExpenseKind,
    authorName: r.author?.profile?.full_name ?? null,
    fromKassa: r.from_staff_id === null,
    holderName: r.holder?.profile?.full_name ?? null,
    salaryLinked: r.salary_entry_id !== null,
    deleteReason: r.delete_reason,
  }));
}
export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>[number];
