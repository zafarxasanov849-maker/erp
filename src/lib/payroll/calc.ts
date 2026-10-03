/**
 * Ish haqi hisobi (PRD §3.6, tasdiqlangan H–K qoidalar) — toza funksiyalar.
 * Kirish: oy, kelishuvlar, guruh × kun statistikasi (tushum, davomati belgilangan darslar), yozuvlar.
 * Chiqish: har kelishuv/guruh bo'yicha qatorlar va oy yakuni (hisoblangan, bonus, jarima, berilgan, qoldiq).
 */
import { roundDiv } from "@/lib/billing/calc";
import { type IsoDate, maxDate, minDate, monthBounds } from "@/lib/dates";
import type { Money } from "@/lib/money";

export type SalaryType = "fixed_monthly" | "fixed_per_group" | "percent_of_revenue" | "per_lesson";
export type SalaryEntryKind = "payout" | "bonus" | "penalty" | "override";

export interface SalaryRule {
  id: string;
  type: SalaryType;
  /** so'm: qat'iy oylik, guruh uchun qat'iy, bitta dars narxi */
  amount: Money | null;
  /** foiz (30 = 30%), ikki xonagacha */
  percent: number | null;
  groupId: string | null;
  validFrom: IsoDate;
  validTo: IsoDate | null;
}

/** payroll_group_stats() qatori: guruh × kun */
export interface GroupDayStat {
  groupId: string;
  groupName: string;
  /** hisob paytidagi guruh ustozi */
  teacherId: string | null;
  day: IsoDate;
  revenue: Money;
  markedLessons: number;
}

export interface SalaryEntry {
  id: string;
  kind: SalaryEntryKind;
  amount: Money;
  voided: boolean;
  createdAt: string;
}

export interface SalaryLine {
  ruleId: string;
  type: SalaryType;
  groupId: string | null;
  groupName: string | null;
  /** asos: tushum (so'm), darslar soni yoki kunlar soni — turiga qarab */
  base: number;
  /** kelishuv amal qilgan kunlar (oy ichida) */
  from: IsoDate;
  to: IsoDate;
  amount: Money;
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
}

/** Kelishuv oyning qaysi kunlarida amal qiladi; amal qilmasa null. */
export function ruleWindow(rule: SalaryRule, month: string): { from: IsoDate; to: IsoDate } | null {
  const [first, last] = monthBounds(month);
  const from = maxDate(rule.validFrom, first);
  const to = minDate(rule.validTo ?? last, last);
  return from <= to ? { from, to } : null;
}

/** Foiz → bazis punkt (30.5% → 3050), shunda hisob butun sonlarda. */
function basisPoints(percent: number): number {
  return Math.round(percent * 100);
}

/** Kelishuvga tegishli guruhlar: aniq guruh yoki ustozning (hisob paytidagi) hamma guruhlari. */
function ruleGroups(rule: SalaryRule, staffId: string, stats: readonly GroupDayStat[]) {
  const groups = new Map<string, string>();
  for (const s of stats) {
    if (rule.groupId ? s.groupId === rule.groupId : s.teacherId === staffId) {
      groups.set(s.groupId, s.groupName);
    }
  }
  if (rule.groupId && !groups.has(rule.groupId)) groups.set(rule.groupId, "");
  return [...groups].sort((a, b) => a[1].localeCompare(b[1]));
}

/** Oyning hisob qatorlari (J: qat'iy oylik kunlar ulushiga; guruh uchun — belgilangan dars bo'lsa to'liq). */
export function salaryLines(input: {
  month: string;
  staffId: string;
  rules: readonly SalaryRule[];
  stats: readonly GroupDayStat[];
}): SalaryLine[] {
  const { month, staffId, rules, stats } = input;
  const [, last] = monthBounds(month);
  const daysInMonth = Number(last.slice(8, 10));
  const lines: SalaryLine[] = [];

  for (const rule of rules) {
    const w = ruleWindow(rule, month);
    if (!w) continue;
    const inWindow = (groupId: string) =>
      stats.filter((s) => s.groupId === groupId && s.day >= w.from && s.day <= w.to);
    const line = (groupId: string | null, groupName: string | null, base: number, amount: Money) =>
      lines.push({ ruleId: rule.id, type: rule.type, groupId, groupName, base, ...w, amount });

    switch (rule.type) {
      case "fixed_monthly": {
        const days = daysBetween(w.from, w.to);
        line(null, null, days, roundDiv((rule.amount ?? 0) * days, daysInMonth));
        break;
      }
      case "fixed_per_group": {
        for (const [groupId, name] of ruleGroups(rule, staffId, stats)) {
          const lessons = inWindow(groupId).reduce((s, x) => s + x.markedLessons, 0);
          line(groupId, name || null, lessons, lessons > 0 ? (rule.amount ?? 0) : 0);
        }
        break;
      }
      case "percent_of_revenue": {
        const groups = ruleGroups(rule, staffId, stats);
        if (groups.length === 0) line(null, null, 0, 0);
        for (const [groupId, name] of groups) {
          const revenue = inWindow(groupId).reduce((s, x) => s + x.revenue, 0);
          line(
            groupId,
            name || null,
            revenue,
            roundDiv(revenue * basisPoints(rule.percent ?? 0), 10_000),
          );
        }
        break;
      }
      case "per_lesson": {
        const groups = ruleGroups(rule, staffId, stats);
        if (groups.length === 0) line(null, null, 0, 0);
        for (const [groupId, name] of groups) {
          const lessons = inWindow(groupId).reduce((s, x) => s + x.markedLessons, 0);
          line(groupId, name || null, lessons, lessons * (rule.amount ?? 0));
        }
        break;
      }
    }
  }
  return lines;
}

export interface SalarySummary {
  calculated: Money;
  /** oyga xos o'zgartirish (bo'lsa — hisoblanganning o'rniga) */
  override: Money | null;
  accrued: Money;
  bonus: Money;
  penalty: Money;
  paid: Money;
  /** qoldiq: musbat — berilishi kerak, manfiy — ortiqcha berilgan */
  due: Money;
}

/** K: qoldiq = (o'zgartirish yoki hisoblangan) + bonus − jarima − berilgan. Bekor qilinganlar hisobga olinmaydi. */
export function summarizeSalary(
  lines: readonly SalaryLine[],
  entries: readonly SalaryEntry[],
): SalarySummary {
  const live = entries.filter((e) => !e.voided);
  const sum = (kind: SalaryEntryKind) =>
    live.filter((e) => e.kind === kind).reduce((s, e) => s + e.amount, 0);
  const overrides = live
    .filter((e) => e.kind === "override")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const calculated = lines.reduce((s, l) => s + l.amount, 0);
  const override = overrides.at(-1)?.amount ?? null;
  const accrued = override ?? calculated;
  const bonus = sum("bonus");
  const penalty = sum("penalty");
  const paid = sum("payout");
  return {
    calculated,
    override,
    accrued,
    bonus,
    penalty,
    paid,
    due: accrued + bonus - penalty - paid,
  };
}

export function computeSalary(input: {
  month: string;
  staffId: string;
  rules: readonly SalaryRule[];
  stats: readonly GroupDayStat[];
  entries: readonly SalaryEntry[];
}) {
  const lines = salaryLines(input);
  return { lines, ...summarizeSalary(lines, input.entries) };
}

/** Oylik ro'yxati uchun: shu oyda amal qiladigan kelishuvi yoki yozuvi bor xodimlar. */
export function hasSalaryActivity(
  month: string,
  rules: readonly SalaryRule[],
  entries: readonly SalaryEntry[],
): boolean {
  return rules.some((r) => ruleWindow(r, month) !== null) || entries.some((e) => !e.voided);
}
