import { z } from "zod";

import { passwordField, phoneField, requiredText } from "@/lib/validation";

const access = {
  roleId: z.uuid({ error: "validation.required" }),
  isTeacher: z.boolean(),
  allBranches: z.boolean(),
  branchIds: z.array(z.uuid()),
};

const branchRequired = (v: { allBranches: boolean; branchIds: string[] }) =>
  v.allBranches || v.branchIds.length > 0;

export const staffCreateSchema = z
  .object({
    fullName: requiredText(100),
    phone: phoneField,
    tempPassword: passwordField,
    ...access,
  })
  .refine(branchRequired, { error: "validation.branchRequired", path: ["branchIds"] });
export type StaffCreateValues = z.infer<typeof staffCreateSchema>;

export const staffUpdateSchema = z
  .object({
    id: z.uuid(),
    isActive: z.boolean(),
    ...access,
  })
  .refine(branchRequired, { error: "validation.branchRequired", path: ["branchIds"] });
export type StaffUpdateValues = z.infer<typeof staffUpdateSchema>;
