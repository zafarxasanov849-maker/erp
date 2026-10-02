/**
 * Telefon raqamlari: bazada doim "+998XXXXXXXXX" (E.164) ko'rinishida.
 * Kod (birinchi 2 raqam) TEKSHIRILMAYDI — yangi operatorlar va shahar raqamlari ham qabul qilinadi.
 * Faqat uzunlik (9 raqam) va format tekshiriladi.
 */

/**
 * Ma'lum mobil operator kodlari — faqat ko'rsatish uchun (raqamni rad etish uchun emas).
 * Ro'yxatda yo'q kod ham qabul qilinadi, shunchaki operator nomi null bo'ladi.
 */
export const KNOWN_OPERATOR_CODES: Readonly<Record<string, string>> = {
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

export const PHONE_RE = /^\+998\d{9}$/;

export type PhoneError = "empty" | "invalid_format";

export type PhoneParseResult =
  | { ok: true; phone: string; code: string; operator: string | null }
  | { ok: false; error: PhoneError };

/**
 * Har xil yozuvni "+998XXXXXXXXX" ga keltiradi:
 * "90 123 45 67", "(90) 123-45-67", "901234567", "998901234567", "+998 90 123 45 67", "8 90 123 45 67".
 */
export function normalizePhone(input: string): PhoneParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "empty" };
  if (/[^\d\s()+\-.]/.test(trimmed)) return { ok: false, error: "invalid_format" };

  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) digits = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("8")) digits = digits.slice(1);
  else if (trimmed.startsWith("+")) return { ok: false, error: "invalid_format" };

  if (digits.length !== 9) return { ok: false, error: "invalid_format" };

  const code = digits.slice(0, 2);
  return { ok: true, phone: `+998${digits}`, code, operator: KNOWN_OPERATOR_CODES[code] ?? null };
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input).ok;
}

/** "+998901234567" → "+998 90 123 45 67". Noma'lum format bo'lsa o'zgarishsiz qaytaradi. */
export function formatPhone(phone: string): string {
  if (!PHONE_RE.test(phone)) return phone;
  const d = phone.slice(4);
  return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

/**
 * PhoneInput uchun: foydalanuvchi yozayotgan matnni "90 123 45 67" ko'rinishiga keltiradi.
 * To'liq raqam (+998 bilan) yopishtirilsa ham ishlaydi. Ko'pi bilan 9 raqam.
 */
export function formatLocalPhoneInput(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length > 9 && digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(" ");
}

/** "+998901234567" → "90 123 45 67" (formani tahrirlash uchun). */
export function toLocalPhoneInput(phone: string | null | undefined): string {
  if (!phone) return "";
  return formatLocalPhoneInput(phone);
}
