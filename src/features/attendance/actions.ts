"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, ForbiddenError, parseInput, runAction, unwrap } from "@/lib/action";
import { canAny, getOrgContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { onAttendanceMarked } from "./notify";
import { type LessonNotesValues, type MarksInput, lessonNotesSchema, marksSchema } from "./schema";

/** Ustoz (attendance.view) yoki admin (attendance.manage); qolgani — set_attendance() ichida */
async function requireAttendance() {
  const ctx = await getOrgContext();
  if (!canAny(ctx, ["attendance.view", "attendance.manage"]))
    throw new ForbiddenError("attendance.view");
  return ctx;
}

/**
 * Bitta darsning belgilarini saqlash. Ustoz muddati, a'zolik, muzlatish va
 * late_marked/edited_after — set_attendance() ichida (RLS bilan bir xil joyda).
 */
export async function saveAttendance(input: MarksInput): Promise<ActionResult> {
  return runAction(async () => {
    await requireAttendance();
    const v = parseInput(marksSchema, input);
    const supabase = await createClient();
    unwrap(
      await supabase.rpc("set_attendance", {
        p_lesson: v.lessonId,
        p_marks: v.marks.map((m) => ({ enrollment_id: m.enrollmentId, status: m.status })),
      }),
    );
    await onAttendanceMarked(
      v.lessonId,
      v.marks.filter((m) => m.status === "absent").map((m) => m.enrollmentId),
    );
    return null;
  });
}

export async function saveLessonNotes(input: LessonNotesValues): Promise<ActionResult> {
  return runAction(async () => {
    await requireAttendance();
    const v = parseInput(lessonNotesSchema, input);
    const supabase = await createClient();
    unwrap(
      await supabase.rpc("set_lesson_notes", {
        p_lesson: v.lessonId,
        p_topic: v.topic,
        p_homework: v.homework,
      }),
    );
    revalidatePath("/", "layout");
    return null;
  });
}
