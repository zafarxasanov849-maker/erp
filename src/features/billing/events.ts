import "server-only";

import type { BillingReason } from "@/lib/billing/calc";

import { reconcileEnrollments, reconcileLessons } from "./engine.server";

/**
 * Pulga ta'sir qiluvchi hodisalar (PRD §5.3–5.8). Server Action o'z ishini qilib bo'lgach chaqiradi.
 * Hisob-kitob xatosi foydalanuvchi amalini bekor qilmaydi — tungi cron xuddi shu holatni qayta tekshiradi.
 */
export async function onEnrollmentsChanged(
  enrollmentIds: readonly string[],
  reason: BillingReason,
  actorStaffId: string | null,
): Promise<void> {
  try {
    await reconcileEnrollments(enrollmentIds, { reason, actorStaffId });
  } catch (e) {
    console.error("[billing]", reason, enrollmentIds, e);
  }
}

/** §5.7: bayram e'lon qilindi yoki o'chirildi */
export async function onLessonsChanged(
  lessonIds: readonly string[],
  actorStaffId: string | null,
): Promise<void> {
  try {
    await reconcileLessons(lessonIds, { reason: "holiday", actorStaffId });
  } catch (e) {
    console.error("[billing] lessons", lessonIds, e);
  }
}
