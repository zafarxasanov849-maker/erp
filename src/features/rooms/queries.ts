import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export async function listRooms(orgId: string) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("rooms")
      .select("id, name, capacity, branch_id, branch:branches ( name )")
      .eq("organization_id", orgId)
      .order("name"),
  );
}

export type RoomRow = Awaited<ReturnType<typeof listRooms>>[number];
