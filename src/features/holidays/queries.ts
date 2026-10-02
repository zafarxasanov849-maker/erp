import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export async function listHolidays(orgId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("holidays")
      .select(
        "id, date, reason, branch_id, branch:branches ( name ), lessons:lessons!lessons_cancel_holiday_id_fkey ( count )",
      )
      .eq("organization_id", orgId)
      .order("date", { ascending: false }),
  );
  return rows.map(({ lessons, ...h }) => ({ ...h, cancelledLessons: lessons[0]?.count ?? 0 }));
}

export type HolidayRow = Awaited<ReturnType<typeof listHolidays>>[number];
