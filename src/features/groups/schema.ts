import { z } from "zod";

import { parseUiDate } from "@/lib/dates";
import { toMinutes } from "@/lib/schedule";
import {
  moneyField,
  optionalUiDateField,
  requiredText,
  timeField,
  uiDateField,
} from "@/lib/validation";

const optionalUuid = z.union([z.uuid(), z.literal("")]);

export const groupSchema = z
  .object({
    id: z.uuid().optional(),
    name: requiredText(60),
    branchId: z.uuid({ error: "validation.required" }),
    courseId: z.uuid({ error: "validation.required" }),
    teacherId: optionalUuid,
    roomId: optionalUuid,
    monthlyPrice: moneyField,
    weekdays: z.array(z.number().int().min(1).max(7)).min(1, { error: "validation.weekdays" }),
    startTime: timeField,
    endTime: timeField,
    startDate: uiDateField,
    endDate: optionalUiDateField,
    isActive: z.boolean(),
  })
  .refine(
    (v) =>
      !timeField.safeParse(v.startTime).success ||
      !timeField.safeParse(v.endTime).success ||
      toMinutes(v.endTime) > toMinutes(v.startTime),
    {
      error: "validation.timeRange",
      path: ["endTime"],
    },
  )
  .refine(
    (v) => {
      const s = parseUiDate(v.startDate);
      const e = v.endDate ? parseUiDate(v.endDate) : null;
      return !s || !e || e >= s;
    },
    { error: "validation.dateRange", path: ["endDate"] },
  );
export type GroupValues = z.input<typeof groupSchema>;
