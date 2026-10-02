/**
 * Pul — butun so'mda (bazada bigint). Hech qachon kasr son emas.
 * supabase-js int8 ni JSON number qilib qaytaradi; so'mdagi summalar
 * Number.MAX_SAFE_INTEGER dan ancha kichik, shuning uchun number yetarli,
 * lekin har kirishda butun son ekanini tekshiramiz.
 */
export type Money = number;

export type MoneyLocale = "uz" | "ru";

const CURRENCY: Record<MoneyLocale, string> = {
  uz: "so'm",
  ru: "сум",
};

/** Manfiy summalar uchun haqiqiy minus belgisi (U+2212), defis emas. */
export const MINUS_SIGN = "−";

export function toMoney(value: number | bigint): Money {
  const n = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`Money must be a safe integer (so'm), got: ${String(value)}`);
  }
  return n;
}

function groupThousands(abs: number): string {
  return String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export interface FormatMoneyOptions {
  locale?: MoneyLocale;
  /** false bo'lsa "so'm" qo'shilmaydi (jadval ustunlari uchun). */
  currency?: boolean;
  /** true bo'lsa musbat summa oldiga "+" qo'yiladi (tranzaksiyalar ro'yxati). */
  signed?: boolean;
}

/** 1250000 → "1 250 000 so'm"; -5000 → "−5 000 so'm". */
export function formatMoney(value: number | bigint, options: FormatMoneyOptions = {}): string {
  const { locale = "uz", currency = true, signed = false } = options;
  const n = toMoney(value);
  const sign = n < 0 ? MINUS_SIGN : signed && n > 0 ? "+" : "";
  const body = sign + groupThousands(Math.abs(n));
  return currency ? `${body} ${CURRENCY[locale]}` : body;
}

/**
 * Foydalanuvchi kiritgan matnni so'mga aylantiradi: "1 250 000", "1250000 so'm", "−5 000".
 * Kasr qism, harflar yoki bo'sh qator bo'lsa null qaytaradi.
 */
export function parseMoney(input: string): Money | null {
  const cleaned = input
    .trim()
    .replace(/(so['ʻ’`]?m|сум)$/i, "")
    .replace(/[\s  ]/g, "")
    .replace(MINUS_SIGN, "-");
  if (!/^-?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : null;
}

const COMPACT_UNITS: Record<MoneyLocale, [number, string][]> = {
  uz: [
    [1e9, "mlrd"],
    [1e6, "mln"],
    [1e3, "ming"],
  ],
  ru: [
    [1e9, "млрд"],
    [1e6, "млн"],
    [1e3, "тыс."],
  ],
};

/** Grafik o'qlari uchun qisqa ko'rinish: 12 500 000 → "12,5 mln"; 850 000 → "850 ming". */
export function formatMoneyCompact(value: number, locale: MoneyLocale = "uz"): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS_SIGN : "";
  for (const [size, unit] of COMPACT_UNITS[locale]) {
    if (abs >= size) {
      const n = Math.round((abs / size) * 10) / 10;
      return `${sign}${String(n).replace(".", ",")} ${unit}`;
    }
  }
  return sign + groupThousands(abs);
}
