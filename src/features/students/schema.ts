import { z } from "zod";

import { parseUiDate } from "@/lib/dates";
import {
  optionalPhoneField,
  optionalText,
  optionalUiDateField,
  phoneField,
  requiredText,
  uiDateField,
} from "@/lib/validation";

export const ENROLLMENT_STATUSES = ["trial", "active", "frozen", "left"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/** students_overview.status (PRD §6) */
export const STUDENT_STATUSES = ["active", "trial", "frozen", "left", "new", "archived"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

const optionalUuid = z.union([z.uuid(), z.literal("")]);

const profileFields = {
  fullName: requiredText(100),
  phone: phoneField,
  gender: z.enum(["male", "female", ""]),
  birthDate: optionalUiDateField,
  parentName: optionalText(100),
  parentPhone: optionalPhoneField,
  telegram: optionalText(64),
  address: optionalText(200),
  school: optionalText(100),
  passportSeries: optionalText(20),
};

export const newEnrollmentSchema = z.object({
  groupId: z.uuid(),
  status: z.enum(["trial", "active"]),
  date: uiDateField,
});
export type NewEnrollmentValues = z.input<typeof newEnrollmentSchema>;

export const studentCreateSchema = z.object({
  branchId: z.uuid({ error: "validation.required" }),
  joinedAt: uiDateField,
  tagIds: z.array(z.uuid()),
  enrollments: z
    .array(newEnrollmentSchema)
    .refine((list) => new Set(list.map((e) => e.groupId)).size === list.length, {
      error: "validation.duplicateGroup",
    }),
  ...profileFields,
});
export type StudentCreateValues = z.input<typeof studentCreateSchema>;

export const studentUpdateSchema = z.object({
  id: z.uuid(),
  tagIds: z.array(z.uuid()),
  ...profileFields,
});
export type StudentUpdateValues = z.input<typeof studentUpdateSchema>;

export const enrollSchema = z.object({
  studentId: z.uuid(),
  groupId: z.uuid({ error: "validation.required" }),
  status: z.enum(["trial", "active"]),
  date: uiDateField,
});
export type EnrollValues = z.input<typeof enrollSchema>;

export const activateSchema = z.object({ enrollmentId: z.uuid(), date: uiDateField });
export type ActivateValues = z.input<typeof activateSchema>;

export const leaveSchema = z.object({
  enrollmentId: z.uuid(),
  date: uiDateField,
  reasonId: z.uuid({ error: "validation.reasonRequired" }),
});
export type LeaveValues = z.input<typeof leaveSchema>;

export const transferSchema = z.object({
  enrollmentId: z.uuid(),
  groupId: z.uuid({ error: "validation.required" }),
  date: uiDateField,
  reasonId: optionalUuid,
});
export type TransferValues = z.input<typeof transferSchema>;

export const freezeSchema = z
  .object({
    enrollmentId: z.uuid(),
    from: uiDateField,
    to: uiDateField,
    reasonId: optionalUuid,
  })
  .refine(
    (v) => {
      const a = parseUiDate(v.from);
      const b = parseUiDate(v.to);
      return !a || !b || b >= a;
    },
    { error: "validation.dateRange", path: ["to"] },
  );
export type FreezeValues = z.input<typeof freezeSchema>;

export const noteSchema = z.object({ studentId: z.uuid(), body: requiredText(2000) });
export type NoteValues = z.input<typeof noteSchema>;

/** "@username" → "username" */
export function normalizeTelegram(value: string): string | null {
  const v = value
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/t\.me\//i, "");
  return v === "" ? null : v;
}
