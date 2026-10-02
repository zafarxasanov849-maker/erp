import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/** Kirishsiz ochiladigan sahifalar. /api/* — har biri o'zini o'zi tekshiradi (hook imzosi, CRON_SECRET). */
const PUBLIC_PREFIXES = ["/login", "/register", "/verify", "/reset", "/api/"];
/** Kirgan foydalanuvchi bu sahifalarga kirsa — bosh sahifaga. */
const GUEST_ONLY = ["/login", "/register", "/reset"];

function matches(path: string, prefixes: readonly string[]) {
  return prefixes.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));
}

/**
 * Har so'rovda Supabase sessiyasini yangilaydi (access token muddati o'tsa refresh)
 * va kirmagan foydalanuvchini /login ga yo'naltiradi.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getSupabaseEnv();
  if (!env) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase env o'rnatilmagan.");
    }
    return response; // lokal: sahifalar Supabase env yo'qligi haqida xato ko'rsatadi
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

  // getClaims() va createServerClient orasiga kod qo'ymang — sessiya yangilanishi buziladi.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;

  const path = request.nextUrl.pathname;
  if (!signedIn && !matches(path, PUBLIC_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = path === "/" ? "" : `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return redirectWithCookies(url, response);
  }
  if (signedIn && matches(path, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
