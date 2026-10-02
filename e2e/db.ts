/**
 * E2E uchun tez tayyorgarlik: lokal Supabase'ga service role bilan to'g'ridan-to'g'ri yozish
 * (15 talabani UI orqali qo'shish testni sekinlashtiradi). Faqat lokal muhitda.
 */
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} topilmadi (.env.local)`);
  return line.slice(name.length + 1).trim();
}

export function adminDb() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("E2E faqat lokal Supabase bilan");
  return createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

/** Guruhga N ta faol talaba (joinedAt sanasidan) */
export async function seedGroupStudents(groupId: string, names: string[], joinedAt: string) {
  const db = adminDb();
  const { data: group, error } = await db
    .from("groups")
    .select("organization_id, branch_id")
    .eq("id", groupId)
    .single();
  if (error) throw error;
  const { data: students, error: e1 } = await db
    .from("students")
    .insert(
      names.map((full_name, i) => ({
        organization_id: group.organization_id,
        branch_id: group.branch_id,
        full_name,
        phone: `+99833${String(Date.now() + i).slice(-7)}`,
        joined_at: joinedAt,
      })),
    )
    .select("id, full_name");
  if (e1) throw e1;
  const { error: e2 } = await db.from("enrollments").insert(
    students.map((s) => ({
      organization_id: group.organization_id,
      student_id: s.id,
      group_id: groupId,
      status: "active",
      joined_at: joinedAt,
      activated_at: joinedAt,
    })),
  );
  if (e2) throw e2;
  return students;
}

/** O'tgan sanalar uchun darslar (jadval generatori faqat bugundan boshlab yaratadi) */
export async function seedPastLessons(groupId: string, dates: string[]) {
  const db = adminDb();
  const { data: group, error } = await db
    .from("groups")
    .select("organization_id, start_time, end_time")
    .eq("id", groupId)
    .single();
  if (error) throw error;
  const { error: e1 } = await db.from("lessons").upsert(
    dates.map((date) => ({
      organization_id: group.organization_id,
      group_id: groupId,
      date,
      start_time: group.start_time,
      end_time: group.end_time,
      status: "scheduled" as const,
    })),
    { onConflict: "group_id,date,start_time", ignoreDuplicates: true },
  );
  if (e1) throw e1;
}
