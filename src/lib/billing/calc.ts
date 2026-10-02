/**
 * Hisob-kitob qoidalari (PRD §5) — toza funksiyalar. Kirish: guruh jadvali, bayramlar, sanalar, narx;
 * chiqish: summa va darslar. Baza, vaqt va tarmoq yo'q — hammasi parametr orqali.
 *
 * Asosiy g'oya — "daftar" (ledger): har a'zolik va oy uchun qaysi dars qancha narxda yechilgani
 * tranzaksiyalarda saqlanadi. Har hodisada (oylik yechish, faollashish, muzlatish, chiqish, bayram,
 * chegirma) shu oy uchun "bo'lishi kerak" holat hisoblanadi va daftar bilan farqi bitta tranzaksiya
 * bo'lib yoziladi. Har tranzaksiya alohida yaxlitlanadi (§5.9).
 */
import { type IsoDate, eachDay, isoWeekday, monthBounds } from "../dates";
import type { Money } from "../money";

/** Foiz chegirma (2 xona kasr) aniq bo'lishi uchun narxlar 1/10 000 so'mda hisoblanadi */
export const SCALE = 10_000;

export type Rounding = 1 | 100 | 1000;

export interface BillingGroup {
  /** ISO hafta kunlari: 1 = Du ... 7 = Ya */
  weekdays: readonly number[];
  startDate: IsoDate;
  endDate: IsoDate | null;
  /** Oylik narx (a'zolikda alohida narx bo'lsa — o'sha) */
  price: Money;
}

export interface Discount {
  /** 0..100, 2 xona kasr */
  percent: number | null;
  amount: Money | null;
  from: IsoDate;
  to: IsoDate | null;
}

export interface BillingEnrollment {
  /** Faol bo'lgan sana; null — hali sinovda (sinov darslari uchun pul olinmaydi, §5.4) */
  activatedAt: IsoDate | null;
  /** Chiqqan sana (shu kungi dars hisobga kiradi) */
  leftAt: IsoDate | null;
  freezes: readonly (readonly [IsoDate, IsoDate])[];
  discounts: readonly Discount[];
}

/** Oy taqvimi: bayram va bekor qilingan dars sanalari (§5.1) */
export interface MonthCalendar {
  holidays: readonly IsoDate[];
  cancelled: readonly IsoDate[];
}

export interface BillingSettings {
  rounding: Rounding;
  /** §5.6: chiqqandan keyingi darslar ulushi qaytarilsinmi (default true) */
  refundOnLeave: boolean;
}

/** Oy uchun asos — birinchi yechishda qotiriladi, keyingi tuzatishlar shu bilan hisoblanadi */
export interface MonthBasis {
  /** Chegirmasiz oylik narx */
  base: Money;
  /** Oydagi darslar soni (§5.1) */
  full: number;
}

export interface LedgerLesson {
  /** Dars sanasi */
  d: IsoDate;
  /** Narx ulushi × full × SCALE: dars narxi = p / (full × SCALE). Musbat — yechilgan, manfiy — qaytarilgan */
  p: number;
}

/** Bitta tranzaksiyaning daftar qismi (transactions.billing) */
export interface LedgerEntry {
  month: string;
  basis: MonthBasis;
  lessons: readonly LedgerLesson[];
}

export type BillingReason =
  "monthly" | "activation" | "freeze" | "leave" | "holiday" | "discount" | "recalc";

export interface PlannedTransaction {
  kind: "charge" | "adjustment";
  /** Manfiy — yechish, musbat — qaytarish */
  amount: Money;
  month: string;
  basis: MonthBasis;
  /** Faqat o'zgargan darslar (farq) */
  lessons: LedgerLesson[];
  /** Yechilgan (+) yoki qaytarilgan (−) darslar soni */
  lessonsCount: number;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  /** Shu tranzaksiyadagi darslardan kamida bittasiga chegirma qo'llangan */
  discounted: boolean;
}

// ---------------------------------------------------------------------------
// §5.9 Yaxlitlash
// ---------------------------------------------------------------------------

/** num/den ni step so'mgacha yaxlitlash, yarimi noldan uzoqqa (simmetrik) */
export function roundDiv(num: number, den: number, step: Rounding = 1): Money {
  if (den <= 0 || !Number.isSafeInteger(num) || !Number.isSafeInteger(den)) {
    throw new RangeError(`roundDiv: ${num}/${den}`);
  }
  const sign = num < 0 ? -1 : 1;
  const unit = den * step;
  const q = Math.floor((2 * Math.abs(num) + unit) / (2 * unit));
  return sign * q * step || 0;
}

// ---------------------------------------------------------------------------
// §5.1 Darslar soni
// ---------------------------------------------------------------------------

/**
 * Guruh jadvali bo'yicha [from, to] oralig'idagi dars sanalari: guruh boshlanishi va tugashi ichida,
 * bayram va bekor qilingan sanalarsiz.
 */
export function lessonsInPeriod(
  group: Pick<BillingGroup, "weekdays" | "startDate" | "endDate">,
  from: IsoDate,
  to: IsoDate,
  holidays: readonly IsoDate[] = [],
  cancelled: readonly IsoDate[] = [],
): IsoDate[] {
  const start = from > group.startDate ? from : group.startDate;
  const end = group.endDate && group.endDate < to ? group.endDate : to;
  if (start > end) return [];
  const weekdays = new Set(group.weekdays);
  const skip = new Set([...holidays, ...cancelled]);
  return eachDay(start, end).filter((d) => weekdays.has(isoWeekday(d)) && !skip.has(d));
}

/**
 * Oydagi to'liq darslar soni — oyning hamma kunlari bo'yicha (guruh oy o'rtasida ochilgan bo'lsa ham:
 * tasdiqlangan A-qoida), bayram va bekor qilingan sanalarsiz.
 */
export function lessonsInFullMonth(
  weekdays: readonly number[],
  month: string,
  calendar: MonthCalendar,
): number {
  const [from, to] = monthBounds(month);
  return lessonsInPeriod(
    { weekdays, startDate: from, endDate: to },
    from,
    to,
    calendar.holidays,
    calendar.cancelled,
  ).length;
}

// ---------------------------------------------------------------------------
// §5.2 / §5.8 Narx
// ---------------------------------------------------------------------------

/** Shu kundagi chegirma (bir a'zolikda chegirmalar kesishmaydi — bazada tekshiriladi) */
export function discountOn(discounts: readonly Discount[], date: IsoDate): Discount | null {
  return discounts.find((d) => d.from <= date && (d.to === null || date <= d.to)) ?? null;
}

/** Chegirmadan keyingi oylik narx × SCALE (manfiy bo'lmaydi) */
export function scaledPrice(base: Money, discount: Discount | null): number {
  if (!discount) return base * SCALE;
  if (discount.percent !== null) {
    const bp = Math.round(discount.percent * 100); // 12.5% → 1250
    return Math.max(0, base * (SCALE - bp));
  }
  return Math.max(0, (base - (discount.amount ?? 0)) * SCALE);
}

/**
 * §5.2: summa = round(narx_chegirmadan_keyin × darslar_davrda / darslar_to'liq_oyda).
 * To'liq oy uchun summa = narx.
 */
export function chargeForPeriod(input: {
  price: Money;
  discount?: Discount | null;
  lessonsInPeriod: number;
  lessonsInFullMonth: number;
  rounding?: Rounding;
}): Money {
  if (input.lessonsInPeriod <= 0 || input.lessonsInFullMonth <= 0) return 0;
  return roundDiv(
    scaledPrice(input.price, input.discount ?? null) * input.lessonsInPeriod,
    input.lessonsInFullMonth * SCALE,
    input.rounding ?? 1,
  );
}

// ---------------------------------------------------------------------------
// Oy rejasi: "bo'lishi kerak" holat − daftar = tranzaksiya
// ---------------------------------------------------------------------------

function isFrozen(e: BillingEnrollment, d: IsoDate): boolean {
  return e.freezes.some(([from, to]) => from <= d && d <= to);
}

export interface PlanMonthInput {
  month: string;
  group: BillingGroup;
  enrollment: BillingEnrollment;
  calendar: MonthCalendar;
  /** Shu a'zolik va oy uchun avvalgi yozuvlar (yechish va tuzatishlar) */
  ledger: readonly LedgerEntry[];
  settings: BillingSettings;
}

/**
 * Shu oy uchun yozilishi kerak bo'lgan tranzaksiya (yoki null — o'zgarish yo'q).
 * Hamma qoidalar shu yerda: §5.2 oylik, §5.3 faollashish, §5.4 sinov, §5.5 muzlatish,
 * §5.6 chiqish, §5.7 bayram, §5.8 chegirma.
 */
export function planMonth(input: PlanMonthInput): PlannedTransaction | null {
  const { month, group, enrollment, calendar, ledger, settings } = input;
  const basis: MonthBasis = ledger[0]?.basis ?? {
    base: group.price,
    full: lessonsInFullMonth(group.weekdays, month, calendar),
  };
  if (basis.full <= 0) return null;

  // Daftardagi joriy holat: sana → yechilgan ulush
  const current = new Map<IsoDate, number>();
  for (const entry of ledger) {
    for (const l of entry.lessons) current.set(l.d, (current.get(l.d) ?? 0) + l.p);
  }

  const [from, to] = monthBounds(month);
  const dates = lessonsInPeriod(group, from, to, calendar.holidays, calendar.cancelled);
  const desired = new Map<IsoDate, number>();
  let discounted = false;
  for (const d of dates) {
    const active =
      enrollment.activatedAt !== null && d >= enrollment.activatedAt && !isFrozen(enrollment, d);
    const afterLeave = enrollment.leftAt !== null && d > enrollment.leftAt;
    if (!active) {
      desired.set(d, 0);
    } else if (afterLeave) {
      // §5.6: qaytarilmasin sozlamasida allaqachon yechilgan dars o'z holicha qoladi
      desired.set(d, settings.refundOnLeave ? 0 : (current.get(d) ?? 0));
    } else {
      const discount = discountOn(enrollment.discounts, d);
      if (discount) discounted = true;
      desired.set(d, scaledPrice(basis.base, discount));
    }
  }
  // Daftarda bor, lekin endi dars emas (bayram e'lon qilingan, dars bekor qilingan) → 0
  for (const d of current.keys()) if (!desired.has(d)) desired.set(d, 0);

  const lessons: LedgerLesson[] = [];
  for (const [d, want] of [...desired].sort(([a], [b]) => a.localeCompare(b))) {
    const delta = want - (current.get(d) ?? 0);
    if (delta !== 0) lessons.push({ d, p: delta });
  }
  if (lessons.length === 0) return null;

  const sum = lessons.reduce((s, l) => s + l.p, 0);
  const amount = -roundDiv(sum, basis.full * SCALE, settings.rounding);
  if (amount === 0) return null;

  const charged = lessons.filter((l) => l.p > 0).length;
  const refunded = lessons.filter((l) => l.p < 0).length;
  return {
    kind: ledger.length === 0 ? "charge" : "adjustment",
    amount,
    month,
    basis,
    lessons,
    lessonsCount: charged - refunded,
    periodStart: lessons[0]!.d,
    periodEnd: lessons[lessons.length - 1]!.d,
    discounted: discounted && lessons.some((l) => l.p > 0),
  };
}

/**
 * Qaysi oylar ko'rib chiqilishi kerak: daftarda bor oylar va faol bo'lgan oydan joriy oygacha
 * (chiqqan oydan keyingilari emas). Kelajak oylar hech qachon yechilmaydi — ular 1-sanada yechiladi.
 */
export function monthsToReconcile(
  enrollment: Pick<BillingEnrollment, "activatedAt" | "leftAt">,
  ledgerMonths: readonly string[],
  currentMonth: string,
): string[] {
  const months = new Set(ledgerMonths.filter((m) => m <= currentMonth));
  if (enrollment.activatedAt) {
    let m = enrollment.activatedAt.slice(0, 7);
    const last =
      enrollment.leftAt && enrollment.leftAt.slice(0, 7) < currentMonth
        ? enrollment.leftAt.slice(0, 7)
        : currentMonth;
    while (m <= last) {
      months.add(m);
      const [y, mo] = m.split("-").map(Number) as [number, number];
      m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
    }
  }
  return [...months].sort();
}
