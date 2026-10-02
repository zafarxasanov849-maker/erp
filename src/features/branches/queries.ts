import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export async function listBranches(orgId: string) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("branches")
      .select("id, name, address, phone, is_active")
      .eq("organization_id", orgId)
      .order("created_at"),
  );
}

export type BranchRow = Awaited<ReturnType<typeof listBranches>>[number];
