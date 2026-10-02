import { NextResponse, type NextRequest } from "next/server";

import { runNightlyBilling } from "@/features/billing/engine.server";
import { syncGroupLessons } from "@/features/groups/lessons-sync";
import { todayInTashkent } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron har kecha 00:00 (Toshkent) chaqiradi (vercel.json):
// 1) muzlatish boshlangan/tugagan a'zoliklar holatini yangilaydi;
// 2) faol guruhlar darslarini 60 kunga to'ldiradi;
// 3) hisob-kitob: oyning 1-kunida oylik yechish (PRD §5.2), boshqa kunlari — joriy oyni tekshirish
//    (idempotent: idempotency_key, ikki marta ishlasa ham ikki marta yechilmaydi).
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

  const statuses = await admin.rpc("refresh_enrollment_statuses", {});
  if (statuses.error) console.error("[cron:nightly] statuses", statuses.error);

  const { data: groups, error } = await admin.from("groups").select("id").eq("is_active", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let inserted = 0;
  const failed: string[] = [];
  for (const g of groups) {
    try {
      inserted += (await syncGroupLessons(admin, g.id, today)).inserted;
    } catch (e) {
      console.error("[cron:nightly] lessons", g.id, e);
      failed.push(g.id);
    }
  }
  let billing: Awaited<ReturnType<typeof runNightlyBilling>> | { error: string };
  try {
    billing = await runNightlyBilling(today);
  } catch (e) {
    console.error("[cron:nightly] billing", e);
    billing = { error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({
    today,
    billing,
    enrollmentStatusesChanged: statuses.data ?? null,
    groups: groups.length,
    lessonsInserted: inserted,
    failed,
  });
}
