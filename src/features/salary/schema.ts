import { z } from "zod";

import { parseUiDate } from "@/lib/dates";
import { moneyField, optionalText, optionalUiDateField, uiDateField } from "@/lib/validation";

export const SALARY_TYPES = [
  "fixed_monthly",
  "fixed_per_group",
  "percent_of_revenue",
  "per_lesson",
] as const;
export const SALARY_ENTRY_KINDS = ["bonus", "penalty", "override", "payout"] as const;

export const salaryRuleSchema = z
  .object({
    id: z.union([z.uuid(), z.literal("")]),
    staffId: z.uuid(),
    type: z.enum(SALARY_TYPES),
    amount: moneyField.optional(),
    percent: z.number().optional(),
    /** "" — guruhsiz (ustozning hamma guruhlari) */
    groupId: z.union([z.uuid(), z.literal("")]),
    validFrom: uiDateField,
    validTo: optionalUiDateField,
  })
  .refine((v) => v.type === "percent_of_revenue" || (v.amount ?? 0) > 0, {
    error: "validation.money",
    path: ["amount"],
  })
  .refine(
    (v) =>
      v.type !== "percent_of_revenue" ||
      (v.percent !== undefined &&
        v.percent > 0 &&
        v.percent <= 100 &&
        Math.round(v.percent * 100) === v.percent * 100),
    { error: "validation.percent", path: ["percent"] },
  )
  .refine((v) => v.type !== "fixed_per_group" || v.groupId !== "", {
    error: "validation.required",
    path: ["groupId"],
  })
  .refine(
    (v) => {
      if (!v.validTo) return true;
      const a = parseUiDate(v.validFrom);
      const b = parseUiDate(v.validTo);
      return !a || !b || b >= a;
    },
    { error: "validation.dateRange", path: ["validTo"] },
  );
export type SalaryRuleValues = z.input<typeof salaryRuleSchema>;

export const salaryEntrySchema = z
  .object({
    staffId: z.uuid(),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    kind: z.enum(SALARY_ENTRY_KINDS),
    amount: moneyField,
    note: optionalText(500),
    methodId: z.union([z.uuid(), z.literal("")]),
    branchId: z.union([z.uuid(), z.literal("")]),
    fromKassa: z.boolean(),
    paidOn: optionalUiDateField,
  })
  .refine((v) => v.kind === "override" || v.amount > 0, {
    error: "validation.money",
    path: ["amount"],
  })
  .refine((v) => v.kind !== "payout" || v.methodId !== "", {
    error: "validation.required",
    path: ["methodId"],
  })
  .refine((v) => v.kind !== "payout" || v.paidOn !== "", {
    error: "validation.required",
    path: ["paidOn"],
  });
export type SalaryEntryValues = z.input<typeof salaryEntrySchema>;

export const voidSalaryEntrySchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(1, { error: "validation.reasonText" }).max(500),
});
