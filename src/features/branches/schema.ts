import { z } from "zod";

import { optionalPhoneField, optionalText, requiredText } from "@/lib/validation";

export const branchSchema = z.object({
  id: z.uuid().optional(),
  name: requiredText(100),
  address: optionalText(200),
  phone: optionalPhoneField,
  isActive: z.boolean(),
});
export type BranchValues = z.infer<typeof branchSchema>;
