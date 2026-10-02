import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { unwrap } from "@/lib/action";
import { type IsoDate } from "@/lib/dates";
import { type ExistingLesson, generateLessons, lessonWindow, planLessonSync } from "@/lib/schedule";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Guruh darslarini jadvalga moslaydi (bugundan LESSON_HORIZON_DAYS kun).
 * Reja — lib/schedule.ts (toza, testlangan); qo'llash — apply_lesson_plan RPC (bitta tranzaksiya,
 * ruxsat tekshiruvi bilan). Foydalanuvchi klienti ham, service role (cron) ham ishlatishi mumkin.
 */
export async function syncGroupLessons(
  supabase: SupabaseClient<Database>,
  groupId: string,
  today: IsoDate,
) {
  const group = unwrap(
    await supabase
      .from("groups")
      .select(
        "id, organization_id, branch_id, weekdays, start_time, end_time, start_date, end_date, is_active",
      )
      .eq("id", groupId)
      .single(),
  );
  const [from, to] = lessonWindow(today);

  const holidays = unwrap(
    await supabase
      .from("holidays")
      .select("id, date, reason, branch_id")
      .eq("organization_id", group.organization_id)
      .gte("date", from)
      .lte("date", to)
      .or(`branch_id.is.null,branch_id.eq.${group.branch_id}`),
  );

  // Tugagan (nofaol) guruh — kelajakdagi darslar olib tashlanadi
  const planned = group.is_active
    ? generateLessons(
        {
          weekdays: group.weekdays,
          startTime: group.start_time,
          endTime: group.end_time,
          startDate: group.start_date,
          endDate: group.end_date,
        },
        from,
        to,
        holidays,
      )
    : [];

  const rows = unwrap(
    await supabase
      .from("lessons")
      .select("id, date, start_time, end_time, status, cancel_holiday_id, attendance ( count )")
      .eq("group_id", groupId)
      .gte("date", from),
  );
  const existing: ExistingLesson[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status,
    holidayId: r.cancel_holiday_id,
    hasAttendance: (r.attendance[0]?.count ?? 0) > 0,
  }));

  const plan = planLessonSync(existing, planned, from);
  if (plan.insert.length || plan.remove.length || plan.update.length) {
    unwrap(
      await supabase.rpc("apply_lesson_plan", {
        p_group: groupId,
        p_insert:
          plan.insert as unknown as Database["public"]["Functions"]["apply_lesson_plan"]["Args"]["p_insert"],
        p_remove: plan.remove,
        p_update:
          plan.update as unknown as Database["public"]["Functions"]["apply_lesson_plan"]["Args"]["p_update"],
      }),
    );
  }
  return { inserted: plan.insert.length, removed: plan.remove.length, updated: plan.update.length };
}
