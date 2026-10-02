import { z } from "zod";

import { requiredText, uiDateField } from "@/lib/validation";

/** branchId: "" — butun markaz */
export const holidaySchema = z.object({
  date: uiDateField,
  branchId: z.union([z.uuid(), z.literal("")]),
  reason: requiredText(120),
});
export type HolidayValues = z.input<typeof holidaySchema>;
