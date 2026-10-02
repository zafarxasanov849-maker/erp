"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { onLessonsCancelled, onLessonsRestored } from "@/lib/billing/events";
import { createClient } from "@/lib/supabase/server";
import { toIsoDate } from "@/lib/validation";

import { type HolidayValues, holidaySchema } from "./schema";

export async function addHoliday(
  input: HolidayValues,
): Promise<ActionResult<{ cancelled: number }>> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.catalogs");
    const values = parseInput(holidaySchema, input);
    const supabase = await createClient();

    const holiday = unwrap(
      await supabase
        .from("holidays")
        .insert({
          organization_id: ctx.membership.orgId,
          branch_id: values.branchId || null,
          date: toIsoDate(values.date),
          reason: values.reason,
          created_by: ctx.membership.staffId,
        })
        .select("id")
        .single(),
    );
    // O'sha kundagi darslar bekor qilinadi (bazada, bitta tranzaksiyada)
    const cancelled = unwrap(await supabase.rpc("apply_holiday", { p_holiday: holiday.id }));
    await onLessonsCancelled(cancelled);

    revalidatePath("/", "layout");
    return { cancelled: cancelled.length };
  });
}

export async function removeHoliday(id: string): Promise<ActionResult<{ restored: number }>> {
  return runAction(async () => {
    await requirePermission("settings.catalogs");
    const supabase = await createClient();
    const restored = unwrap(await supabase.rpc("remove_holiday", { p_holiday: id }));
    await onLessonsRestored(restored);
    revalidatePath("/", "layout");
    return { restored: restored.length };
  });
}
