"use server";

import { type ActionResult, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

export interface EnrollableGroup {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  courseName: string;
  teacherName: string | null;
  roomName: string | null;
  weekdays: number[];
  startTime: string;
  endTime: string;
}

export interface StudentFormData {
  groups: EnrollableGroup[];
  tags: { id: string; name: string; color: string | null }[];
  branches: { id: string; name: string }[];
  leaveReasons: { id: string; name: string }[];
  freezeReasons: { id: string; name: string }[];
}

/** Talaba paneli va a'zolik dialoglari uchun ma'lumotnomalar (panel ochilganda yuklanadi). */
export async function getStudentFormData(): Promise<ActionResult<StudentFormData>> {
  return runAction(async () => {
    const ctx = await requirePermission("students.view");
    const orgId = ctx.membership.orgId;
    const supabase = await createClient();
    const [groups, tags, reasons] = await Promise.all([
      supabase
        .from("groups")
        .select(
          "id, name, branch_id, weekdays, start_time, end_time, branch:branches ( name ), course:courses ( name ), room:rooms ( name ), teacher:staff ( profile:profiles ( full_name ) )",
        )
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name"),
      supabase.from("tags").select("id, name, color").eq("organization_id", orgId).order("name"),
      supabase
        .from("reasons")
        .select("id, name, kind")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .in("kind", ["leave", "freeze"])
        .order("name"),
    ]);
    const visibleBranch = (id: string) =>
      ctx.membership.allBranches || ctx.branches.some((b) => b.id === id);
    const r = unwrap(reasons);
    return {
      groups: unwrap(groups)
        .filter((g) => visibleBranch(g.branch_id))
        .map((g) => ({
          id: g.id,
          name: g.name,
          branchId: g.branch_id,
          branchName: g.branch?.name ?? "",
          courseName: g.course?.name ?? "",
          teacherName: g.teacher?.profile?.full_name ?? null,
          roomName: g.room?.name ?? null,
          weekdays: g.weekdays,
          startTime: g.start_time.slice(0, 5),
          endTime: g.end_time.slice(0, 5),
        })),
      tags: unwrap(tags),
      branches: ctx.branches,
      leaveReasons: r.filter((x) => x.kind === "leave").map(({ id, name }) => ({ id, name })),
      freezeReasons: r.filter((x) => x.kind === "freeze").map(({ id, name }) => ({ id, name })),
    };
  });
}

/** Takror telefon: shu markazda shu raqamli talabalar (CLAUDE.md qoida 8 — faqat ogohlantirish). */
export async function findStudentsByPhone(
  phoneInput: string,
): Promise<ActionResult<{ id: string; fullName: string; branchId: string }[]>> {
  return runAction(async () => {
    const ctx = await requirePermission("students.view");
    const phone = normalizePhone(phoneInput);
    if (!phone.ok) return [];
    const supabase = await createClient();
    const rows = unwrap(
      await supabase
        .from("students")
        .select("id, full_name, branch_id")
        .eq("organization_id", ctx.membership.orgId)
        .or(`phone.eq.${phone.phone},parent_phone.eq.${phone.phone}`)
        .limit(5),
    );
    return rows.map((r) => ({ id: r.id, fullName: r.full_name, branchId: r.branch_id }));
  });
}
