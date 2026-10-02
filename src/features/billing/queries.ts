import "server-only";

import { type LedgerTransaction, balance, debtSince, oldDebt } from "@/lib/billing/balance";
import type { BillingReason, LedgerLesson, MonthBasis } from "@/lib/billing/calc";
import { unwrap } from "@/lib/action";
import type { IsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export interface LedgerRow {
  id: string;
  kind: LedgerTransaction["kind"];
  amount: number;
  occurredOn: IsoDate;
  createdAt: string;
  enrollmentId: string | null;
  groupName: string | null;
  methodName: string | null;
  note: string | null;
  paymentRef: string | null;
  receiptNo: number | null;
  /** Yechish/tuzatish tafsiloti */
  billing: {
    month: string;
    basis: MonthBasis;
    lessons: LedgerLesson[];
    reason?: BillingReason;
  } | null;
  lessonsCount: number | null;
  createdByName: string | null;
}

/** Talabaning barcha tranzaksiyalari (RLS: payments.view + filial) */
export async function getStudentLedger(studentId: string): Promise<LedgerRow[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("transactions")
      .select(
        "id, kind, amount, occurred_on, created_at, enrollment_id, note, payment_ref, receipt_no, billing, lessons_count, method_id, enrollment:enrollments ( group:groups ( name ) ), author:staff ( profile:profiles ( full_name ) )",
      )
      .eq("student_id", studentId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
  );
  const methods = await methodNames(rows.map((r) => r.method_id));
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    amount: r.amount,
    occurredOn: r.occurred_on,
    createdAt: r.created_at,
    enrollmentId: r.enrollment_id,
    groupName: r.enrollment?.group?.name ?? null,
    methodName: r.method_id ? (methods.get(r.method_id) ?? null) : null,
    note: r.note,
    paymentRef: r.payment_ref,
    receiptNo: r.receipt_no,
    billing: r.billing as LedgerRow["billing"],
    lessonsCount: r.lessons_count,
    createdByName: r.author?.profile?.full_name ?? null,
  }));
}

/** To'lov turi nomlari: "Karta · Uzcard" */
async function methodNames(ids: readonly (string | null)[]): Promise<Map<string, string>> {
  const wanted = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (wanted.length === 0) return new Map();
  const supabase = await createClient();
  const rows = unwrap(await supabase.from("payment_methods").select("id, name, parent_id"));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return new Map(
    wanted.map((id) => {
      const m = byId.get(id);
      const parent = m?.parent_id ? byId.get(m.parent_id) : null;
      return [id, m ? (parent ? `${parent.name} · ${m.name}` : m.name) : ""];
    }),
  );
}

export function toLedgerTransactions(rows: readonly LedgerRow[]): LedgerTransaction[] {
  return rows.map((r) => ({
    kind: r.kind,
    amount: r.amount,
    occurredOn: r.occurredOn,
    createdAt: r.createdAt,
    billingMonth: r.billing?.month ?? null,
    enrollmentId: r.enrollmentId,
  }));
}

export function summarizeLedger(rows: readonly LedgerRow[], currentMonth: string) {
  const txs = toLedgerTransactions(rows);
  return { balance: balance(txs), oldDebt: oldDebt(txs, currentMonth), debtSince: debtSince(txs) };
}

/** To'lov turlari: "Karta · Uzcard" ko'rinishida; ichki turi bor ota tur tanlanmaydi */
export async function getPaymentMethods(orgId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("payment_methods")
      .select("id, name, kind, parent_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name"),
  );
  const names = new Map(rows.map((r) => [r.id, r.name]));
  const parents = new Set(rows.map((r) => r.parent_id).filter(Boolean));
  const order = ["cash", "card", "terminal", "bank", "online"];
  return rows
    .filter((r) => !parents.has(r.id))
    .map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.parent_id ? `${names.get(r.parent_id) ?? ""} · ${r.name}` : r.name,
    }))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
}

export type PaymentMethodOption = Awaited<ReturnType<typeof getPaymentMethods>>[number];

/** Chek: bitta to'lov (bir nechta qism bo'lishi mumkin) */
export async function getReceipt(paymentRef: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("transactions")
      .select(
        "id, kind, amount, occurred_on, created_at, receipt_no, note, organization:organizations ( name ), branch:branches ( name, address, phone ), student:students ( id, full_name, phone ), method_id, enrollment:enrollments ( group:groups ( name ) ), author:staff ( profile:profiles ( full_name ) )",
      )
      .eq("payment_ref", paymentRef)
      .order("created_at"),
  );
  const payments = rows.filter((r) => r.kind === "payment");
  const first = payments[0];
  if (!first) return null;
  const voidRow = rows.find((r) => r.kind === "void");
  const methods = await methodNames([first.method_id]);
  return {
    receiptNo: first.receipt_no,
    paidOn: first.occurred_on,
    createdAt: first.created_at,
    orgName: first.organization?.name ?? "",
    branch: first.branch,
    student: first.student,
    method: first.method_id ? (methods.get(first.method_id) ?? "") : "",
    cashier: first.author?.profile?.full_name ?? null,
    note: first.note,
    total: payments.reduce((s, r) => s + r.amount, 0),
    parts: payments.map((r) => ({ group: r.enrollment?.group?.name ?? null, amount: r.amount })),
    voided: voidRow ? { at: voidRow.created_at, reason: voidRow.note } : null,
  };
}

export type Receipt = NonNullable<Awaited<ReturnType<typeof getReceipt>>>;

/** Qarzdorlar (PRD §6): faol talaba, umumiy balansi < 0. branchId null — barcha filiallar */
export async function getDebtors(orgId: string, branchId: string | null, today: IsoDate) {
  const supabase = await createClient();
  let q = supabase
    .from("students_overview")
    .select("id, full_name, phone, parent_phone, balance, old_debt, group_ids")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .lt("balance", 0)
    .order("balance", { ascending: true })
    .limit(1000);
  if (branchId) q = q.eq("branch_id", branchId);
  const students = unwrap(await q);
  const ids = students.map((s) => s.id!);
  if (ids.length === 0) return [];

  const [txRows, groups] = await Promise.all([
    Promise.all(
      Array.from({ length: Math.ceil(ids.length / 200) }, (_, i) =>
        ids.slice(i * 200, i * 200 + 200),
      ).map(async (part) =>
        unwrap(
          await supabase
            .from("transactions")
            .select("student_id, kind, amount, occurred_on, created_at, billing, enrollment_id")
            .in("student_id", part),
        ),
      ),
    ).then((r) => r.flat()),
    supabase.from("groups").select("id, name").eq("organization_id", orgId),
  ]);
  const groupNames = new Map(unwrap(groups).map((g) => [g.id, g.name]));
  const byStudent = new Map<string, LedgerTransaction[]>();
  const lastPayment = new Map<string, string>();
  for (const t of txRows) {
    const list = byStudent.get(t.student_id) ?? [];
    list.push({
      kind: t.kind,
      amount: t.amount,
      occurredOn: t.occurred_on,
      createdAt: t.created_at,
      billingMonth: (t.billing as { month?: string } | null)?.month ?? null,
      enrollmentId: t.enrollment_id,
    });
    byStudent.set(t.student_id, list);
    if (t.kind === "payment" && (lastPayment.get(t.student_id) ?? "") < t.occurred_on) {
      lastPayment.set(t.student_id, t.occurred_on);
    }
  }
  const dayMs = 86_400_000;
  return students.map((s) => {
    const since = debtSince(byStudent.get(s.id!) ?? []);
    return {
      id: s.id!,
      fullName: s.full_name!,
      phone: s.phone!,
      parentPhone: s.parent_phone,
      balance: s.balance ?? 0,
      oldDebt: s.old_debt ?? 0,
      groups: (s.group_ids ?? []).map((g) => groupNames.get(g) ?? "").filter(Boolean),
      since,
      days: since ? Math.max(0, Math.round((Date.parse(today) - Date.parse(since)) / dayMs)) : null,
      lastPayment: lastPayment.get(s.id!) ?? null,
    };
  });
}

export type Debtor = Awaited<ReturnType<typeof getDebtors>>[number];
