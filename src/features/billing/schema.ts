import { z } from "zod";

import { parseUiDate } from "@/lib/dates";
import { moneyField, optionalText, optionalUiDateField, uiDateField } from "@/lib/validation";

export const paymentSchema = z.object({
  studentId: z.uuid(),
  amount: moneyField.refine((v) => v > 0, { error: "validation.money" }),
  methodId: z.uuid({ error: "validation.required" }),
  paidOn: uiDateField,
  /** "" — guruh ko'rsatilmagan: eng eski qarzdan (FIFO) */
  enrollmentId: z.union([z.uuid(), z.literal("")]),
  note: optionalText(500),
  /** Dialog ochilganda yaratiladi: ikki marta bosilsa ham bitta to'lov */
  key: z.uuid(),
});
export type PaymentValues = z.input<typeof paymentSchema>;

export const voidSchema = z.object({
  paymentRef: z.uuid(),
  reason: z.string().trim().min(1, { error: "validation.reasonText" }).max(500),
});
export type VoidValues = z.input<typeof voidSchema>;

export const discountSchema = z
  .object({
    enrollmentId: z.uuid(),
    type: z.enum(["percent", "amount"]),
    /** Foiz (0..100, 2 xona) yoki so'm */
    value: z.number({ error: "validation.required" }).positive({ error: "validation.discount" }),
    from: uiDateField,
    to: optionalUiDateField,
    reason: optionalText(200),
  })
  .refine(
    (v) => v.type !== "percent" || (v.value <= 100 && Math.round(v.value * 100) === v.value * 100),
    {
      error: "validation.discount",
      path: ["value"],
    },
  )
  .refine((v) => v.type !== "amount" || Number.isInteger(v.value), {
    error: "validation.money",
    path: ["value"],
  })
  .refine(
    (v) => {
      if (!v.to) return true;
      const a = parseUiDate(v.from);
      const b = parseUiDate(v.to);
      return !a || !b || b >= a;
    },
    { error: "validation.dateRange", path: ["to"] },
  );
export type DiscountValues = z.input<typeof discountSchema>;
