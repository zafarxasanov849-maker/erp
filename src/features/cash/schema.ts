import { z } from "zod";

import { moneyField, optionalText } from "@/lib/validation";

export const handoverSchema = z.object({
  branchId: z.uuid({ error: "validation.required" }),
  /** "" — filial kassasi */
  toStaffId: z.union([z.uuid(), z.literal("")]),
  methodId: z.uuid({ error: "validation.required" }),
  amount: moneyField.refine((v) => v > 0, { error: "validation.money" }),
  note: optionalText(500),
});
export type HandoverValues = z.input<typeof handoverSchema>;

export const voidHandoverSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(1, { error: "validation.reasonText" }).max(500),
});
export type VoidHandoverValues = z.input<typeof voidHandoverSchema>;
