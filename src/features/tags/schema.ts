import { z } from "zod";

import { requiredText } from "@/lib/validation";

export const TAG_COLORS = [
  "#64748b",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export const tagSchema = z.object({
  id: z.uuid().optional(),
  name: requiredText(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "validation.color" }),
});
export type TagValues = z.input<typeof tagSchema>;
