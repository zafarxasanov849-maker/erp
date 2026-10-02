import { z } from "zod";

import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { optionalText } from "@/lib/validation";

export const marksSchema = z.object({
  lessonId: z.uuid(),
  marks: z
    .array(z.object({ enrollmentId: z.uuid(), status: z.enum(ATTENDANCE_STATUSES).nullable() }))
    .min(1)
    .max(200),
});
export type MarksInput = z.input<typeof marksSchema>;

export const lessonNotesSchema = z.object({
  lessonId: z.uuid(),
  topic: optionalText(500),
  homework: optionalText(2000),
});
export type LessonNotesValues = z.input<typeof lessonNotesSchema>;
