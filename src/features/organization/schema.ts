import { z } from "zod";

import { requiredText, timeField } from "@/lib/validation";

export const organizationSchema = z
  .object({
    name: requiredText(100),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "validation.color" }),
    workStart: timeField,
    workEnd: timeField,
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
