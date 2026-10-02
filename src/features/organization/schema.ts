import { z } from "zod";

import { requiredText, timeField } from "@/lib/validation";

export const organizationSchema = z
  .object({
    name: requiredText(100),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "validation.color" }),
    workStart: timeField,
    workEnd: timeField,
    teacherEditDays: z
      .number({ error: "validation.editDays" })
      .int({ error: "validation.editDays" })
      .min(0, { error: "validation.editDays" })
      .max(30, { error: "validation.editDays" }),
    absenceThreshold: z
      .number({ error: "validation.absenceThreshold" })
      .int({ error: "validation.absenceThreshold" })
      .min(1, { error: "validation.absenceThreshold" })
      .max(20, { error: "validation.absenceThreshold" }),
    rounding: z.union([z.literal(1), z.literal(100), z.literal(1000)]),
    refundOnLeave: z.boolean(),
    trialLessons: z
      .number({ error: "validation.trialLessons" })
      .int({ error: "validation.trialLessons" })
      .min(0, { error: "validation.trialLessons" })
      .max(20, { error: "validation.trialLessons" }),
  })
  .refine((v) => v.workEnd > v.workStart, {
    error: "validation.timeRange",
    path: ["workEnd"],
  });
export type OrganizationValues = z.infer<typeof organizationSchema>;

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
