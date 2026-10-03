import "server-only";

import {
  getAttendanceReport,
  getBranchNames,
  getExpenseReport,
  getFinanceReport,
  getLeftStudents,
  getRevenue,
  getStudentCounts,
  getStudentFlow,
} from "@/features/metrics/queries";
import { unwrap } from "@/lib/action";
import { shiftMonth } from "@/lib/dates";
import type { Period } from "@/lib/metrics/period";
import { type ExpenseKind, profitOf } from "@/lib/metrics/profit";
import { createClient } from "@/lib/supabase/server";

/**
 * Hisobot ma'lumotlari — sahifa ham, Excel ham shu yerdan oladi (raqamlar doim bir xil).
 * branchId = null — ko'rinadigan barcha filiallar.
 */

function monthsOf(period: Period): string[] {
  const out: string[] = [];
  for (let m = period.from.slice(0, 7); m <= period.to.slice(0, 7); m = shiftMonth(m, 1))
    out.push(m);
  return out;
}

export async function buildFinanceReport(orgId: string, branchId: string | null, period: Period) {
  const [rows, total, branches, expenses] = await Promise.all([
    getFinanceReport(orgId, branchId, period.from, period.to),
    getRevenue(orgId, branchId, period.from, period.to),
    getBranchNames(orgId),
    getExpenseReport(orgId, branchId, period.from, period.to),
  ]);
  // Ustunlar: tanlangan filial yoki faol filiallar + tushumi bor nofaollar
  const columns = branches.filter((b) =>
    branchId ? b.id === branchId : b.isActive || rows.some((r) => r.branchId === b.id),
  );
  const months = monthsOf(period).map((month) => {
    const inMonth = rows.filter((r) => r.month === month);
    const revenue = inMonth.reduce((s, r) => s + r.revenue, 0);
    return {
      month,
      byBranch: Object.fromEntries(
        columns.map((b) => [
          b.id,
          inMonth.filter((r) => r.branchId === b.id).reduce((s, r) => s + r.revenue, 0),
        ]),
      ) as Record<string, number>,
      payments: inMonth.reduce((s, r) => s + r.payments, 0),
      ...profitOf(
        revenue,
        expenses.filter((e) => e.month === month),
      ),
    };
  });
  const byKind = new Map<ExpenseKind, number>();
  for (const e of expenses) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + e.amount);
  return {
    columns: columns.map(({ id, name }) => ({ id, name })),
    months,
    total,
    profit: profitOf(total.revenue, expenses),
    expensesByKind: [...byKind.entries()]
      .map(([kind, amount]) => ({ kind, amount }))
      .sort((a, b) => b.amount - a.amount),
    average: total.payments > 0 ? Math.round(total.revenue / total.payments) : 0,
  };
}
export type FinanceReportData = Awaited<ReturnType<typeof buildFinanceReport>>;

export async function buildAttendanceReport(
  orgId: string,
  branchId: string | null,
  period: Period,
) {
  return getAttendanceReport(orgId, branchId, period.from, period.to);
}

export async function buildStudentsReport(orgId: string, branchId: string | null, period: Period) {
  const [flow, left, atEnd] = await Promise.all([
    getStudentFlow(orgId, branchId, period.from, period.to),
    getLeftStudents(orgId, branchId, period.from, period.to),
    getStudentCounts(orgId, branchId, period.to),
  ]);
  const names = new Map<string, string>();
  if (left.length > 0) {
    const supabase = await createClient();
    const rows = unwrap(
      await supabase
        .from("students")
        .select("id, full_name")
        .in(
          "id",
          left.slice(0, 500).map((l) => l.student_id),
        ),
    );
    for (const r of rows) names.set(r.id, r.full_name);
  }
  const reasons = new Map<string, number>();
  for (const l of left) reasons.set(l.reason ?? "", (reasons.get(l.reason ?? "") ?? 0) + 1);
  const sum = (k: "new" | "activated" | "frozen" | "left" | "returned") =>
    flow.reduce((s, m) => s + m[k], 0);
  return {
    flow,
    totals: {
      new: sum("new"),
      activated: sum("activated"),
      frozen: sum("frozen"),
      left: sum("left"),
      returned: sum("returned"),
    },
    atEnd,
    reasons: [...reasons.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    left: left
      .map((l) => ({
        id: l.student_id,
        name: names.get(l.student_id) ?? "",
        leftOn: l.left_on,
        reason: l.reason,
      }))
      .sort((a, b) => b.leftOn.localeCompare(a.leftOn)),
  };
}
export type StudentsReportData = Awaited<ReturnType<typeof buildStudentsReport>>;
