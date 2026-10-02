import "server-only";

import { unwrap } from "@/lib/action";
import type { IsoDate } from "@/lib/dates";
import type { AttendanceCounts } from "@/lib/metrics/rates";
import { rpcBranch } from "@/lib/metrics/rpc";
import { createClient } from "@/lib/supabase/server";

/**
 * Ko'rsatkichlar (PRD §6) — faqat SQL funksiyalaridan (20261002170000_metrics.sql).
 * Bosh sahifa va hisobotlar bir xil funksiyani chaqiradi, shuning uchun raqamlar doim mos.
 * branchId = null — foydalanuvchiga ko'rinadigan barcha filiallar.
 */

export interface StudentCounts {
  active: number;
  trial: number;
  frozen: number;
}

export async function getStudentCounts(
  orgId: string,
  branchId: string | null,
  date: IsoDate,
): Promise<StudentCounts> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.rpc("metric_students_at", {
      p_org: orgId,
      p_branch: rpcBranch(branchId),
      p_date: date,
    }),
  );
  return rows[0] ?? { active: 0, trial: 0, frozen: 0 };
}

export interface DebtSummary {
  count: number;
  /** Jami qarz, musbat son (so'm). */
  total: number;
}

export async function getDebtSummary(
  orgId: string,
  branchId: string | null,
  date: IsoDate,
): Promise<DebtSummary> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.rpc("metric_debtors", {
      p_org: orgId,
      p_branch: rpcBranch(branchId),
      p_date: date,
    }),
  );
  return { count: rows.length, total: -rows.reduce((s, r) => s + r.balance, 0) };
}

export interface Revenue {
  revenue: number;
  payers: number;
  payments: number;
}

export async function getRevenue(
  orgId: string,
  branchId: string | null,
  from: IsoDate,
  to: IsoDate,
): Promise<Revenue> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.rpc("metric_revenue", {
      p_org: orgId,
      p_branch: rpcBranch(branchId),
      p_from: from,
      p_to: to,
    }),
  );
  return rows[0] ?? { revenue: 0, payers: 0, payments: 0 };
}

export async function getLeftStudents(
  orgId: string,
  branchId: string | null,
  from: IsoDate,
  to: IsoDate,
) {
  const supabase = await createClient();
  return unwrap(
    await supabase.rpc("metric_left_students", {
      p_org: orgId,
      p_branch: rpcBranch(branchId),
      p_from: from,
      p_to: to,
    }),
  );
}

export interface FinanceRow {
  month: string;
  branchId: string;
  revenue: number;
  payers: number;
  payments: number;
}

/** Tushum oy × filial bo'yicha (metric_revenue bilan bir xil ta'rif). */
export async function getFinanceReport(
  orgId: string,
  branchId: string | null,
  from: IsoDate,
  to: IsoDate,
): Promise<FinanceRow[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.rpc("report_finance", {
      p_org: orgId,
      p_branch: rpcBranch(branchId),
      p_from: from,
      p_to: to,
    }),
  );
  return rows.map((r) => ({
    month: r.month,
    branchId: r.branch_id,
    revenue: r.revenue,
    payers: r.payers,
    payments: r.payments,
  }));
}

export interface AttendanceReport {
  totals: AttendanceCounts;
  groups: (AttendanceCounts & { id: string; name: string; teacher: string | null })[];
  teachers: (AttendanceCounts & { id: string | null; name: string })[];
  absent_students: { id: string; name: string; absent: number; marked: number }[];
}

export async function getAttendanceReport(
  orgId: string,
  branchId: string | null,
  from: IsoDate,
  to: IsoDate,
): Promise<AttendanceReport> {
  const supabase = await createClient();
  const data = unwrap(
    await supabase.rpc("report_attendance", {
      p_org: orgId,
      p_branch: rpcBranch(branchId),
      p_from: from,
      p_to: to,
    }),
  );
  return data as unknown as AttendanceReport;
}

export interface FlowMonth {
  month: string;
  new: number;
  activated: number;
  frozen: number;
  left: number;
  left_reasons: Record<string, number>;
  returned: number;
}

export async function getStudentFlow(
  orgId: string,
  branchId: string | null,
  from: IsoDate,
  to: IsoDate,
): Promise<FlowMonth[]> {
  const supabase = await createClient();
  const data = unwrap(
    await supabase.rpc("report_student_flow", {
      p_org: orgId,
      p_branch: rpcBranch(branchId),
      p_from: from,
      p_to: to,
    }),
  );
  return data as unknown as FlowMonth[];
}

export interface TeacherSummary {
  groups: number;
  students: number;
  lessons: number;
  unmarked: number;
}

export async function getTeacherSummary(orgId: string, date: IsoDate): Promise<TeacherSummary> {
  const supabase = await createClient();
  const rows = unwrap(await supabase.rpc("teacher_summary", { p_org: orgId, p_date: date }));
  return rows[0] ?? { groups: 0, students: 0, lessons: 0, unmarked: 0 };
}

/** Filial nomlari (hisobotlar uchun; nofaol filiallar ham — eski tushumlar ularga yozilgan bo'lishi mumkin). */
export async function getBranchNames(orgId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("branches")
      .select("id, name, is_active")
      .eq("organization_id", orgId)
      .order("created_at"),
  );
  return rows.map((b) => ({ id: b.id, name: b.name, isActive: b.is_active }));
}
