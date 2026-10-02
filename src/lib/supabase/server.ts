import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

/**
 * Server Components, Server Actions va Route Handlers uchun klient.
 * Foydalanuvchi sessiyasi bilan ishlaydi — RLS amal qiladi.
 * Har so'rov uchun yangisini yarating (qayta ishlatmang).
 */
export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component ichidan cookie yozib bo'lmaydi — sessiyani middleware yangilaydi.
        }
      },
    },
  });
}
