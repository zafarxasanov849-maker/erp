import { isValid } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/** Barcha sanalar shu vaqt zonasida ko'rsatiladi va hisoblanadi. */
export const TIMEZONE = "Asia/Tashkent";

export const DATE_FORMAT = "dd.MM.yyyy"; // KK.OO.YYYY
export const TIME_FORMAT = "HH:mm";

/** Bazadagi `date` ustuni ko'rinishi: "2026-10-02". */
export type IsoDate = string;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UI_DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isIsoDate(value: string): value is IsoDate {
  const m = ISO_DATE_RE.exec(value);
  return !!m && isRealDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

/**
 * Sana → "02.10.2026".
 * - "YYYY-MM-DD" (bazadagi `date`) vaqt zonasisiz, aynan o'sha kun sifatida.
 * - Date yoki timestamptz satri — Toshkent vaqtida.
 */
export function formatDate(value: Date | string): string {
  if (typeof value === "string") {
    const m = ISO_DATE_RE.exec(value);
    if (m) {
      if (!isRealDate(Number(m[1]), Number(m[2]), Number(m[3]))) {
        throw new RangeError(`Invalid date: ${value}`);
      }
      return `${m[3]}.${m[2]}.${m[1]}`;
    }
  }
  return formatInTimeZone(toInstant(value), TIMEZONE, DATE_FORMAT);
}

/** Vaqt → "14:30" (Toshkent). Bazadagi `time` ("14:30:00") ham qabul qilinadi. */
export function formatTime(value: Date | string): string {
  if (typeof value === "string") {
    const m = /^(\d{2}):(\d{2})(:\d{2}(\.\d+)?)?$/.exec(value);
    if (m) return `${m[1]}:${m[2]}`;
  }
  return formatInTimeZone(toInstant(value), TIMEZONE, TIME_FORMAT);
}

/** "02.10.2026 14:30" (Toshkent). */
export function formatDateTime(value: Date | string): string {
  return formatInTimeZone(toInstant(value), TIMEZONE, `${DATE_FORMAT} ${TIME_FORMAT}`);
}

/** Foydalanuvchi kiritgan "02.10.2026" → "2026-10-02". Noto'g'ri bo'lsa null. */
export function parseUiDate(input: string): IsoDate | null {
  const m = UI_DATE_RE.exec(input.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  if (!isRealDate(Number(y), Number(mo), Number(d))) return null;
  return `${y}-${mo}-${d}`;
}

/** Toshkentdagi bugungi sana, "YYYY-MM-DD". Server UTC'da ishlasa ham to'g'ri. */
export function todayInTashkent(now: Date = new Date()): IsoDate {
  return formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd");
}

/** Oy kaliti "YYYY-MM" — idempotency_key uchun (charge:{enrollment_id}:{YYYY-MM}). */
export function monthKey(value: IsoDate | Date): string {
  if (typeof value === "string") {
    if (!isIsoDate(value)) throw new RangeError(`Invalid ISO date: ${value}`);
    return value.slice(0, 7);
  }
  return formatInTimeZone(value, TIMEZONE, "yyyy-MM");
}

function toInstant(value: Date | string): Date {
  const d = typeof value === "string" ? new Date(value) : value;
  if (!isValid(d)) throw new RangeError(`Invalid date: ${String(value)}`);
  return d;
}

// ---------- ISO sana arifmetikasi (vaqt zonasisiz, "YYYY-MM-DD") ----------

function isoToUtc(value: IsoDate): Date {
  if (!isIsoDate(value)) throw new RangeError(`Invalid ISO date: ${value}`);
  return new Date(`${value}T00:00:00Z`);
}

function utcToIso(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const d = isoToUtc(value);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToIso(d);
}

/** ISO hafta kuni: 1 = Dushanba … 7 = Yakshanba. */
export function isoWeekday(value: IsoDate): number {
  const day = isoToUtc(value).getUTCDay(); // 0 = Yakshanba
  return day === 0 ? 7 : day;
}

/** `from` dan `to` gacha (ikkalasi ham kiradi) har bir kun. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a < b ? a : b;
}

/** Oyning birinchi va oxirgi kuni: monthBounds("2026-02") → ["2026-02-01", "2026-02-28"]. */
export function monthBounds(month: string): [IsoDate, IsoDate] {
  const first = `${month}-01`;
  if (!isIsoDate(first)) throw new RangeError(`Invalid month: ${month}`);
  const d = isoToUtc(first);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return [first, utcToIso(d)];
}

/** Oyni siljitish: shiftMonth("2026-12", 1) → "2027-01". */
export function shiftMonth(month: string, delta: number): string {
  const [first] = monthBounds(month);
  const d = isoToUtc(first);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return utcToIso(d).slice(0, 7);
}

/** DateInput uchun: yozilayotgan raqamlarni "KK.OO.YYYY" maskasiga keltiradi. */
export function formatUiDateInput(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  const parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
  return parts.join(".");
}

/** TimeInput uchun: raqamlarni "SS:dd" (24 soat) maskasiga keltiradi. */
export function formatTimeInput(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}
