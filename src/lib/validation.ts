import { z } from "zod";

import { parseUiDate } from "./dates";
import { MIN_PASSWORD_LENGTH } from "./password";
import { normalizePhone } from "./phone";

/**
 * Umumiy zod maydonlari. Xato matni — messages/*.json dagi kalit (validation.*);
 * FormMessage uni tarjima qiladi. Bitta sxema klientda ham, serverda ham ishlatiladi.
 */
export const requiredText = (max = 200) =>
  z
    .string()
    .trim()
    .min(1, { error: "validation.required" })
    .max(max, { error: "validation.tooLong" });

export const optionalText = (max = 500) =>
  z.string().trim().max(max, { error: "validation.tooLong" });

/** PhoneInput qiymati ("90 123 45 67"); serverda normalizePhone() bilan +998... ga aylantiring. */
export const phoneField = z
  .string()
  .trim()
  .min(1, { error: "validation.required" })
  .refine((v) => normalizePhone(v).ok, { error: "validation.phone" });

export const optionalPhoneField = z
  .string()
  .trim()
  .refine((v) => v === "" || normalizePhone(v).ok, { error: "validation.phone" });

export const passwordField = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { error: "validation.passwordMin" })
  .max(72, { error: "validation.tooLong" });

export const otpField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: "validation.otp" });

export const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "validation.time" });

/** Phone maydonini bazaga yoziladigan ko'rinishga keltirish (validatsiyadan o'tgan bo'lishi kerak). */
export function toE164(phone: string): string {
  const r = normalizePhone(phone);
  if (!r.ok) throw new Error("Phone must be validated before toE164()");
  return r.phone;
}

/** DateInput qiymati "KK.OO.YYYY"; serverda parseUiDate() bilan "YYYY-MM-DD" ga aylantiring. */
export const uiDateField = z
  .string()
  .trim()
  .min(1, { error: "validation.required" })
  .refine((v) => parseUiDate(v) !== null, { error: "validation.date" });

export const optionalUiDateField = z
  .string()
  .trim()
  .refine((v) => v === "" || parseUiDate(v) !== null, { error: "validation.date" });

/** Validatsiyadan o'tgan "KK.OO.YYYY" → "YYYY-MM-DD". */
export function toIsoDate(value: string): string {
  const iso = parseUiDate(value);
  if (!iso) throw new Error("Date must be validated before toIsoDate()");
  return iso;
}

/** Butun so'm (MoneyInput qiymati). */
export const moneyField = z
  .number({ error: "validation.required" })
  .int()
  .min(0, { error: "validation.money" })
  .max(1_000_000_000_000, { error: "validation.money" });
