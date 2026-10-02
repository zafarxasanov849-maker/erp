import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export async function listCourses(orgId: string) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("courses")
      .select("id, name, monthly_price, lesson_minutes, is_active")
      .eq("organization_id", orgId)
      .order("is_active", { ascending: false })
      .order("name"),
  );
}

export type CourseRow = Awaited<ReturnType<typeof listCourses>>[number];
