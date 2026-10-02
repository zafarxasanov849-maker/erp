import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

export async function getOrganization(orgId: string) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("organizations")
      .select("id, name, logo_url, primary_color, work_start, work_end")
      .eq("id", orgId)
      .single(),
  );
}
