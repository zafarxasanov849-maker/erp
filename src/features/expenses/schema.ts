import { z } from "zod";

import { moneyField, optionalText, uiDateField } from "@/lib/validation";

export const EXPENSE_KINDS = [
  "operating",
  "salary",
  "rent",
  "marketing",
  "tax",
  "owner_draw",
] as const;
export type ExpenseKind = (typeof EXPENSE_KINDS)[number];

export const expenseSchema = z.object({
  /** "" — yangi xarajat */
  id: z.union([z.uuid(), z.literal("")]),
  branchId: z.uuid({ error: "validation.required" }),
  categoryId: z.uuid({ error: "validation.required" }),
  amount: moneyField.refine((v) => v > 0, { error: "validation.money" }),
  methodId: z.uuid({ error: "validation.required" }),
  paidAt: uiDateField,
  recipient: optionalText(200),
  note: optionalText(500),
  /** G: true — filial kassasidan, false — o'z qo'limdan */
  fromKassa: z.boolean(),
});
export type ExpenseValues = z.input<typeof expenseSchema>;

export const expenseDeleteSchema = z.object({
  id: z.uuid(),
  reason: optionalText(500),
});

export const expenseCategorySchema = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  name: z.string().trim().min(1, { error: "validation.required" }).max(100),
  kind: z.enum(EXPENSE_KINDS),
  isActive: z.boolean(),
});
export type ExpenseCategoryValues = z.input<typeof expenseCategorySchema>;
