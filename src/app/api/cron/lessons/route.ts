import { NextResponse, type NextRequest } from "next/server";

import { syncGroupLessons } from "@/features/groups/lessons-sync";
import { todayInTashkent } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron har kecha chaqiradi (vercel.json): faol guruhlar darslarini 60 kunga to'ldiradi.
// Vercel CRON_SECRET'ni Authorization sarlavhasida yuboradi.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayInTashkent();
  const { data: groups, error } = await admin.from("groups").select("id").eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let inserted = 0;
  const failed: string[] = [];
  for (const g of groups) {
    try {
      inserted += (await syncGroupLessons(admin, g.id, today)).inserted;
    } catch (e) {
      console.error("[cron:lessons]", g.id, e);
      failed.push(g.id);
    }
  }
  return NextResponse.json({ today, groups: groups.length, inserted, failed });
}
