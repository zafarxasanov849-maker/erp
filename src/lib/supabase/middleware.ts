import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Har so'rovda Supabase sessiyasini yangilaydi (access token muddati o'tsa refresh qiladi)
 * va yangi cookie'larni javobga yozadi. Kirish talab qilish (redirect /login) 1-bosqichda qo'shiladi.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getSupabaseEnv();
  if (!env) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase env o'rnatilmagan.");
    }
    return response; // lokal: Supabase'siz ham qobiqni ochish mumkin
  }

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getUser()/getClaims() va createServerClient orasiga kod qo'ymang — sessiya yangilanishi buziladi.
  await supabase.auth.getClaims();

  return response;
}
