/**
 * Telefon raqamlari: bazada doim "+998XXXXXXXXX" (E.164) ko'rinishida.
 * Kod (2 raqam) — mobil operator yoki shahar kodi.
 */

/**
 * O'zbekiston mobil operatorlari kodlari.
 * Yangi kod paydo bo'lsa shu ro'yxatga qo'shing (testni ham yangilang).
 */
export const MOBILE_OPERATOR_CODES: Readonly<Record<string, string>> = {
  "20": "OQ",
  "33": "Humans",
  "50": "Ucell",
  "55": "Uzmobile",
  "77": "Uzmobile",
  "88": "Mobiuz",
  "90": "Beeline",
  "91": "Beeline",
  "93": "Ucell",
  "94": "Ucell",
  "95": "Uzmobile",
  "97": "Mobiuz",
  "98": "Perfectum",
  "99": "Uzmobile",
};

/** Shahar (statsionar) kodlari: 71 — Toshkent, 6x/7x — viloyatlar. Ota-ona raqami uchun kerak bo'lishi mumkin. */
export const LANDLINE_CODES: ReadonlySet<string> = new Set([
  "61",
  "62",
  "65",
  "66",
  "67",
  "69",
  "70",
  "71",
  "72",
  "73",
  "74",
  "75",
  "76",
  "79",
]);

export const PHONE_RE = /^\+998\d{9}$/;

export type PhoneError = "empty" | "invalid_format" | "unknown_operator";

export type PhoneParseResult =
  | { ok: true; phone: string; code: string; operator: string | null; isMobile: boolean }
  | { ok: false; error: PhoneError };

export interface NormalizePhoneOptions {
  /** true bo'lsa shahar raqamlari ham qabul qilinadi (default: faqat mobil). */
  allowLandline?: boolean;
}

/**
 * Har xil yozuvni "+998XXXXXXXXX" ga keltiradi:
 * "90 123 45 67", "(90) 123-45-67", "901234567", "998901234567", "+998 90 123 45 67", "8 90 123 45 67".
 */
export function normalizePhone(
  input: string,
  options: NormalizePhoneOptions = {},
): PhoneParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "empty" };
  if (/[^\d\s()+\-.]/.test(trimmed)) return { ok: false, error: "invalid_format" };

  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) digits = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("8")) digits = digits.slice(1);
  else if (trimmed.startsWith("+")) return { ok: false, error: "invalid_format" };

  if (digits.length !== 9) return { ok: false, error: "invalid_format" };

  const code = digits.slice(0, 2);
  const operator = MOBILE_OPERATOR_CODES[code];
  if (operator) {
    return { ok: true, phone: `+998${digits}`, code, operator, isMobile: true };
  }
  if (options.allowLandline && LANDLINE_CODES.has(code)) {
    return { ok: true, phone: `+998${digits}`, code, operator: null, isMobile: false };
  }
  return { ok: false, error: "unknown_operator" };
}

export function isValidPhone(input: string, options?: NormalizePhoneOptions): boolean {
  return normalizePhone(input, options).ok;
}

/** "+998901234567" → "+998 90 123 45 67". Noma'lum format bo'lsa o'zgarishsiz qaytaradi. */
export function formatPhone(phone: string): string {
  if (!PHONE_RE.test(phone)) return phone;
  const d = phone.slice(4);
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}
