/**
 * Supabase ulanish sozlamalari. NEXT_PUBLIC_* qiymatlari brauzerga ham chiqadi —
 * u yerda faqat URL va anon (publishable) kalit bo'ladi. Service role kaliti hech qachon bu yerda emas.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL va NEXT_PUBLIC_SUPABASE_ANON_KEY o'rnatilmagan (.env.local, README'ga qarang).",
    );
  }
  return env;
}
