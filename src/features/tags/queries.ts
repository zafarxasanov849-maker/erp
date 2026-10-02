import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export async function listTags(orgId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("tags")
      .select("id, name, color, students:student_tags ( count )")
      .eq("organization_id", orgId)
      .order("name"),
  );
  return rows.map(({ students, ...t }) => ({ ...t, studentCount: students[0]?.count ?? 0 }));
}

export type TagRow = Awaited<ReturnType<typeof listTags>>[number];
