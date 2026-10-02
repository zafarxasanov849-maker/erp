import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

/**
 * Service role klienti — RLS'ni chetlab o'tadi.
 * FAQAT cron (/api/cron/*) va webhook'larda (/api/telegram, /api/eskiz) ishlating.
 * Hech qachon Client Component'ga yoki foydalanuvchi so'roviga bog'liq kodga uzatmang.
 */
export function createAdminClient() {
  const { url } = requireSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY o'rnatilmagan.");

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
