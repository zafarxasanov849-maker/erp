/**
 * Ko'rsatkichlar uchun davrlar va o'zgarish foizi (tasdiqlangan B-qoida):
 * - oqimlar (tushum, ketganlar): oy boshidan bugungacha ↔ o'tgan oyning xuddi shu kunlari;
 * - zaxiralar (faol talabalar, qarzdorlik): bugun ↔ o'tgan oyning xuddi shu kuni.
 * Toza funksiyalar, sanalar "YYYY-MM-DD".
 */
import { type IsoDate, monthBounds, shiftMonth } from "@/lib/dates";

export interface Period {
  from: IsoDate;
  to: IsoDate;
}

/** Oy boshidan berilgan kungacha. */
export function monthToDate(today: IsoDate): Period {
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

/**
 * Bir oy oldingi xuddi shu kun. Oyda bunday kun bo'lmasa — oyning oxirgi kuni
 * (31.03 → 28.02 yoki 29.02).
 */
export function sameDayLastMonth(date: IsoDate): IsoDate {
  const month = shiftMonth(date.slice(0, 7), -1);
  const [, last] = monthBounds(month);
  const day = `${month}-${date.slice(8, 10)}`;
  return day > last ? last : day;
}

/** O'tgan oyning xuddi shu kunlari: 01.10–15.10 → 01.09–15.09; 01.03–31.03 → 01.02–28.02. */
export function samePeriodLastMonth(period: Period): Period {
  return { from: sameDayLastMonth(period.from), to: sameDayLastMonth(period.to) };
}

/**
 * O'zgarish foizi, bir xona aniqlikda. Oldingi qiymat 0 bo'lsa — solishtirib bo'lmaydi (null).
 * Manfiy qiymatlar (qarz) uchun maxraj — modul: qarz −100 dan −150 ga o'tsa +50%.
 */
export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** Oxirgi n oy (joriy oy bilan), eskisidan yangisiga: ["2026-05", …, "2026-10"]. */
export function lastMonths(today: IsoDate, n: number): string[] {
  const current = today.slice(0, 7);
  return Array.from({ length: n }, (_, i) => shiftMonth(current, i - n + 1));
}

export const REPORT_PRESETS = ["month", "last_month", "quarter", "year", "custom"] as const;
export type ReportPreset = (typeof REPORT_PRESETS)[number];

/** Hisobot davri eng ko'pi bilan 24 oy (katta so'rovlardan himoya). */
export const MAX_REPORT_MONTHS = 24;

/**
 * Hisobot davri: tayyor variant yoki qo'lda (from–to). Kelajak bugun bilan kesiladi.
 * - month: shu oy boshidan bugungacha; last_month: o'tgan oy to'liq;
 * - quarter: oxirgi 3 oy (shu oy bilan); year: 1-yanvardan bugungacha;
 * - custom: from ≤ to bo'lishi, 24 oydan oshmasligi kerak — aks holda "month".
 */
export function resolveReportPeriod(
  preset: ReportPreset,
  today: IsoDate,
  custom?: { from: IsoDate | null; to: IsoDate | null },
): Period & { preset: ReportPreset } {
  const month = today.slice(0, 7);
  switch (preset) {
    case "last_month": {
      const [from, to] = monthBounds(shiftMonth(month, -1));
      return { preset, from, to };
    }
    case "quarter":
      return { preset, from: `${shiftMonth(month, -2)}-01`, to: today };
    case "year":
      return { preset, from: `${today.slice(0, 4)}-01-01`, to: today };
    case "custom": {
      const from = custom?.from;
      const to = custom?.to && custom.to > today ? today : custom?.to;
      const earliest = `${shiftMonth(month, -MAX_REPORT_MONTHS + 1)}-01`;
      if (from && to && from <= to && from >= earliest) return { preset, from, to };
      break;
    }
    case "month":
      break;
  }
  return { preset: "month", ...monthToDate(today) };
}
