import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

/**
 * Server Action natijasi. `error` — messages/*.json dagi kalit (masalan "errors.forbidden").
 */
export type ActionResult<T = null> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Foydalanuvchiga ko'rsatiladigan, kutilgan xato. */
export class ActionError extends Error {
  constructor(
    public readonly key: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(key);
  }
}

export class ForbiddenError extends ActionError {
  constructor(public readonly permission?: string) {
    super("errors.forbidden");
  }
}

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error); // redirect(), notFound(), forbidden()
    if (error instanceof ActionError) {
      return { ok: false, error: error.key, fieldErrors: error.fieldErrors };
    }
    console.error("[action]", error);
    return { ok: false, error: "errors.unexpected" };
  }
}

/** Klientdan kelgan ma'lumotni serverda qayta tekshirish (bitta zod sxema). */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    throw new ActionError("errors.validation", fieldErrors);
  }
  return result.data;
}

// Bazadagi himoya triggerlari xabarlari (supabase/migrations/*_auth_tenancy.sql).
const DB_GUARD_ERRORS = new Set([
  "permission_escalation",
  "owner_locked",
  "owner_role_locked",
  "last_owner",
  "self_deactivate",
  "system_role_delete",
  "system_role_insert",
  "role_immutable_fields",
  "staff_immutable_fields",
  "branch_org_mismatch",
  "too_many_organizations",
  "phone_not_confirmed",
  "group_branch_mismatch",
  "group_course_mismatch",
  "group_teacher_mismatch",
  "group_room_mismatch",
  "room_branch_mismatch",
  "holiday_branch_mismatch",
  "lesson_group_mismatch",
  "lesson_holiday_mismatch",
  "student_branch_mismatch",
  "enrollment_student_mismatch",
  "enrollment_group_mismatch",
  "freeze_enrollment_mismatch",
  "reason_mismatch",
  "group_finished",
  "student_archived",
  "already_enrolled",
  "invalid_status",
  "date_before_join",
  "reason_required",
  "freeze_overlap",
  "freeze_finished",
  "student_has_open_enrollments",
  "lesson_cancelled",
  "lesson_in_future",
  "edit_window_closed",
  "enrollment_not_in_lesson",
  "enrollment_frozen",
]);

/** Supabase/PostgREST xatosini ActionError ga aylantiradi. */
export function dbError(error: PostgrestError): ActionError {
  if (DB_GUARD_ERRORS.has(error.message)) return new ActionError(`errors.db.${error.message}`);
  if (error.code === "42501") return new ForbiddenError();
  if (error.code === "23505") return new ActionError("errors.duplicate");
  if (error.code === "23503") return new ActionError("errors.inUse");
  console.error("[db]", error);
  return new ActionError("errors.unexpected");
}

type SuccessData<R> = R extends { error: null; data: infer D } ? D : never;

/** `{ data, error }` natijasidan ma'lumotni oladi yoki ActionError tashlaydi. */
export function unwrap<R extends { data: unknown; error: PostgrestError | null }>(
  result: R,
): SuccessData<R> {
  if (result.error) throw dbError(result.error);
  return result.data as SuccessData<R>;
}
