import { z } from "zod";

import { requiredText } from "@/lib/validation";

export const roomSchema = z.object({
  id: z.uuid().optional(),
  branchId: z.uuid({ error: "validation.required" }),
  name: requiredText(60),
  capacity: z
    .number()
    .int()
    .min(1, { error: "validation.capacity" })
    .max(1000, { error: "validation.capacity" })
    .nullable(),
});
export type RoomValues = z.input<typeof roomSchema>;
