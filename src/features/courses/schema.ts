import { z } from "zod";

import { moneyField, requiredText } from "@/lib/validation";

export const courseSchema = z.object({
  id: z.uuid().optional(),
  name: requiredText(100),
  monthlyPrice: moneyField,
  lessonMinutes: z
    .number({ error: "validation.required" })
    .int()
    .min(15, { error: "validation.lessonMinutes" })
    .max(600, { error: "validation.lessonMinutes" }),
  isActive: z.boolean(),
});
export type CourseValues = z.input<typeof courseSchema>;
