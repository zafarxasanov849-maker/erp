import "server-only";

import { unwrap } from "@/lib/action";
import { type IsoDate, monthBounds, shiftMonth, todayInTashkent } from "@/lib/dates";
import {
  type GroupDayStat,
  type SalaryEntry,
  type SalaryEntryKind,
  type SalaryRule,
  type SalaryType,
  computeSalary,
  hasSalaryActivity,
} from "@/lib/payroll/calc";
import { createClient } from "@/lib/supabase/server";

/** "?month=YYYY-MM" — noto'g'ri yoki kelajak bo'lsa, joriy oy. */
export function parseMonth(value: string | string[] | undefined): string {
  const current = todayInTashkent().slice(0, 7);
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value <= current
    ? value
    : current;
}

export interface StaffSalaryRule extends SalaryRule {
  staffId: string;
}

export async function getSalaryRules(orgId: string, staffId?: string): Promise<StaffSalaryRule[]> {
  const supabase = await createClient();
  let q = supabase
    .from("salary_rules")
    .select("id, staff_id, type, amount, percent, group_id, valid_from, valid_to")
    .eq("organization_id", orgId)
    .order("valid_from");
  if (staffId) q = q.eq("staff_id", staffId);
  return unwrap(await q).map((r) => ({
    id: r.id,
    staffId: r.staff_id,
    type: r.type as SalaryType,
    amount: r.amount,
    percent: r.percent === null ? null : Number(r.percent),
    groupId: r.group_id,
    validFrom: r.valid_from,
    validTo: r.valid_to,
  }));
}

export interface StaffSalaryEntry extends SalaryEntry {
  staffId: string;
  period: IsoDate;
  note: string | null;
  methodId: string | null;
  paidOn: IsoDate | null;
  voidReason: string | null;
}

export async function getSalaryEntries(
  orgId: string,
  opts: { staffId?: string; from?: IsoDate; to?: IsoDate },
): Promise<StaffSalaryEntry[]> {
  const supabase = await createClient();
  let q = supabase
    .from("salary_entries")
    .select(
      "id, staff_id, period, kind, amount, note, method_id, paid_on, voided_at, void_reason, created_at",
    )
    .eq("organization_id", orgId)
    .order("created_at");
  if (opts.staffId) q = q.eq("staff_id", opts.staffId);
  if (opts.from) q = q.gte("period", opts.from);
  if (opts.to) q = q.lte("period", opts.to);
  return unwrap(await q).map((e) => ({
    id: e.id,
    staffId: e.staff_id,
    period: e.period,
    kind: e.kind as SalaryEntryKind,
    amount: e.amount,
    note: e.note,
    methodId: e.method_id,
    paidOn: e.paid_on,
    voided: e.voided_at !== null,
    voidReason: e.void_reason,
    createdAt: e.created_at,
  }));
}

/** payroll_group_stats(): guruh × kun tushumi va belgilangan darslar (H, I) */
export async function getGroupStats(
  orgId: string,
  month: string,
  staffId: string | null,
): Promise<GroupDayStat[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.rpc("payroll_group_stats", {
      p_org: orgId,
      p_month: `${month}-01`,
      p_staff: staffId as string,
    }),
  );
  return rows.map((r) => ({
    groupId: r.group_id,
    groupName: r.group_name,
    teacherId: r.teacher_id,
    day: r.day,
    revenue: r.revenue,
    markedLessons: r.marked_lessons,
  }));
}

/** Oy bo'yicha hamma xodimlar (kelishuvi yoki yozuvi borlar) */
export async function buildPayroll(orgId: string, month: string) {
  const [first, last] = monthBounds(month);
  const [rules, entries, stats] = await Promise.all([
    getSalaryRules(orgId),
    getSalaryEntries(orgId, { from: first, to: last }),
    getGroupStats(orgId, month, null),
  ]);
  const staffIds = new Set([...rules.map((r) => r.staffId), ...entries.map((e) => e.staffId)]);
  return [...staffIds]
    .map((staffId) => {
      const own = rules.filter((r) => r.staffId === staffId);
      const ownEntries = entries.filter((e) => e.staffId === staffId);
      return {
        staffId,
        active: hasSalaryActivity(month, own, ownEntries),
        types: [
          ...new Set(
            own.filter((r) => r.validTo === null || r.validTo >= first).map((r) => r.type),
          ),
        ],
        ...computeSalary({ month, staffId, rules: own, stats, entries: ownEntries }),
      };
    })
    .filter((r) => r.active);
}
export type PayrollRow = Awaited<ReturnType<typeof buildPayroll>>[number];

/** Bitta xodim: tanlangan oy tafsiloti va oxirgi 12 oy qoldiqlari (K: umumiy qoldiq) */
export async function buildStaffSalary(orgId: string, staffId: string, month: string) {
  const current = todayInTashkent().slice(0, 7);
  const [rules, entries] = await Promise.all([
    getSalaryRules(orgId, staffId),
    getSalaryEntries(orgId, { staffId }),
  ]);
  const earliest = [
    ...rules.map((r) => r.validFrom.slice(0, 7)),
    ...entries.map((e) => e.period.slice(0, 7)),
  ].sort()[0];
  const months: string[] = [];
  const floor = shiftMonth(current, -11);
  for (let m = current; earliest && m >= earliest && m >= floor; m = shiftMonth(m, -1))
    months.push(m);
  if (!months.includes(month)) months.push(month);

  const results = await Promise.all(
    months.map(async (m) => {
      const [first, last] = monthBounds(m);
      const stats = await getGroupStats(orgId, m, staffId);
      return {
        month: m,
        ...computeSalary({
          month: m,
          staffId,
          rules,
          stats,
          entries: entries.filter((e) => e.period >= first && e.period <= last),
        }),
      };
    }),
  );
  const selected = results.find((r) => r.month === month)!;
  const history = results
    .filter((r) => r.month <= current)
    .sort((a, b) => b.month.localeCompare(a.month))
    .filter((r) => r.calculated || r.override !== null || r.bonus || r.penalty || r.paid);
  const [first, last] = monthBounds(month);
  return {
    rules,
    entries: entries.filter((e) => e.period >= first && e.period <= last),
    selected,
    history,
    totalDue: history.reduce((s, r) => s + r.due, 0),
  };
}
