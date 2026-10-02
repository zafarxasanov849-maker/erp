import { z } from "zod";

import { optionalText, requiredText } from "@/lib/validation";

export const roleSchema = z.object({
  id: z.uuid().optional(),
  name: requiredText(60),
  description: optionalText(200),
  permissions: z.array(z.string()),
});
export type RoleValues = z.infer<typeof roleSchema>;
