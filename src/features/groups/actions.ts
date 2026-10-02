"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { todayInTashkent } from "@/lib/dates";
import { type ScheduleConflict, findConflicts, normalizeTime } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import { toIsoDate } from "@/lib/validation";

import { syncGroupLessons } from "./lessons-sync";
import { getConflictCandidates } from "./queries";
import { type GroupValues, groupSchema } from "./schema";

export type SaveGroupResult =
  { saved: true; id: string } | { saved: false; conflicts: ScheduleConflict[] };

export async function saveGroup(input: GroupValues): Promise<ActionResult<SaveGroupResult>> {
  return runAction(async () => {
    const ctx = await requirePermission(input.id ? "groups.update" : "groups.create");
    const values = parseInput(groupSchema, input);
    const orgId = ctx.membership.orgId;

    // Filialga kirish (RLS ham tekshiradi — bu yerda aniq xabar uchun)
    if (!ctx.membership.allBranches && !ctx.branches.some((b) => b.id === values.branchId)) {
      throw new ActionError("errors.forbidden");
    }

    const slot = {
      id: values.id,
      roomId: values.roomId || null,
      teacherId: values.teacherId || null,
      weekdays: [...values.weekdays].sort((a, b) => a - b),
      startTime: normalizeTime(values.startTime),
      endTime: normalizeTime(values.endTime),
      startDate: toIsoDate(values.startDate),
      endDate: values.endDate ? toIsoDate(values.endDate) : null,
    };

    // Faqat faol guruh to'qnashuvga tekshiriladi (tugagan guruh joyni band qilmaydi)
    if (values.isActive) {
      const others = await getConflictCandidates(orgId, slot.roomId, slot.teacherId);
      const conflicts = findConflicts(slot, others);
      if (conflicts.length) return { saved: false as const, conflicts };
    }

    const row = {
      name: values.name,
      branch_id: values.branchId,
      course_id: values.courseId,
      teacher_id: slot.teacherId,
      room_id: slot.roomId,
      monthly_price: values.monthlyPrice,
      weekdays: slot.weekdays,
      start_time: slot.startTime,
      end_time: slot.endTime,
      start_date: slot.startDate,
      end_date: slot.endDate,
      is_active: values.isActive,
    };

    const supabase = await createClient();
    let id: string;
    if (values.id) {
      const updated = unwrap(
        await supabase
          .from("groups")
          .update(row)
          .eq("id", values.id)
          .eq("organization_id", orgId)
          .select("id"),
      );
      if (updated.length !== 1) throw new ActionError("errors.notFound");
      id = values.id;
    } else {
      id = unwrap(
        await supabase
          .from("groups")
          .insert({ ...row, organization_id: orgId })
          .select("id")
          .single(),
      ).id;
    }

    await syncGroupLessons(supabase, id, todayInTashkent());
    revalidatePath("/", "layout");
    return { saved: true as const, id };
  });
}
