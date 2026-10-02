import "server-only";

import { unwrap } from "@/lib/action";
import { type IsoDate, addDays } from "@/lib/dates";
import { normalizeTime } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";

const GROUP_SELECT = `id, name, branch_id, course_id, teacher_id, room_id, monthly_price, weekdays,
  start_time, end_time, start_date, end_date, is_active,
  branch:branches ( name ),
  course:courses ( name ),
  room:rooms ( name ),
  teacher:staff ( id, profile:profiles ( full_name ) )`;

export interface GroupFilters {
  courseId?: string;
  teacherId?: string;
  weekday?: number;
  status?: "active" | "finished";
}

/** branchId null — barcha filiallar. RLS: ustoz faqat o'z guruhlarini ko'radi. */
export async function listGroups(
  orgId: string,
  branchId: string | null,
  filters: GroupFilters,
  today: IsoDate,
) {
  const supabase = await createClient();
  let q = supabase
    .from("groups")
    .select(`${GROUP_SELECT}, enrollments ( count )`)
    .eq("organization_id", orgId)
    .in("enrollments.status", ["trial", "active"])
    .eq("is_active", filters.status !== "finished")
    .order("name");
  if (branchId) q = q.eq("branch_id", branchId);
  if (filters.courseId) q = q.eq("course_id", filters.courseId);
  if (filters.teacherId) q = q.eq("teacher_id", filters.teacherId);
  if (filters.weekday) q = q.contains("weekdays", [filters.weekday]);
  const groups = unwrap(await q);

  // Keyingi dars (14 kun ichida)
  const ids = groups.map((g) => g.id);
  const next = new Map<string, { date: string; startTime: string }>();
  if (ids.length) {
    const lessons = unwrap(
      await supabase
        .from("lessons")
        .select("group_id, date, start_time")
        .in("group_id", ids)
        .eq("status", "scheduled")
        .gte("date", today)
        .lte("date", addDays(today, 14))
        .order("date")
        .order("start_time"),
    );
    for (const l of lessons) {
      if (!next.has(l.group_id)) next.set(l.group_id, { date: l.date, startTime: l.start_time });
    }
  }

  return groups.map(({ enrollments, ...g }) => ({
    ...g,
    teacherName: g.teacher?.profile?.full_name ?? null,
    studentCount: enrollments[0]?.count ?? 0,
    nextLesson: next.get(g.id) ?? null,
  }));
}

export type GroupListRow = Awaited<ReturnType<typeof listGroups>>[number];

export async function getGroup(orgId: string, groupId: string) {
  const supabase = await createClient();
  const g = unwrap(
    await supabase
      .from("groups")
      .select(GROUP_SELECT)
      .eq("organization_id", orgId)
      .eq("id", groupId)
      .maybeSingle(),
  );
  return g ? { ...g, teacherName: g.teacher?.profile?.full_name ?? null } : null;
}

export type GroupDetail = NonNullable<Awaited<ReturnType<typeof getGroup>>>;

export async function listGroupLessons(groupId: string, from: IsoDate, to: IsoDate) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("lessons")
      .select("id, date, start_time, end_time, status, cancel_reason, topic")
      .eq("group_id", groupId)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("start_time"),
  );
}

/** Guruh formasi uchun: kurslar, ustozlar, xonalar, filiallar. */
export async function getGroupFormOptions(orgId: string) {
  const supabase = await createClient();
  const [courses, teachers, rooms, branches] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, monthly_price, lesson_minutes, is_active")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("staff")
      .select("id, all_branches, profile:profiles ( full_name ), staff_branches ( branch_id )")
      .eq("organization_id", orgId)
      .eq("is_teacher", true)
      .eq("is_active", true),
    supabase.from("rooms").select("id, name, branch_id").eq("organization_id", orgId).order("name"),
    supabase
      .from("branches")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("created_at"),
  ]);
  return {
    courses: unwrap(courses),
    teachers: unwrap(teachers)
      .map((t) => ({
        id: t.id,
        name: t.profile?.full_name ?? "",
        allBranches: t.all_branches,
        branchIds: t.staff_branches.map((b) => b.branch_id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    rooms: unwrap(rooms),
    branches: unwrap(branches),
  };
}

export type GroupFormOptions = Awaited<ReturnType<typeof getGroupFormOptions>>;

/** To'qnashuv tekshiruvi uchun: shu xona yoki ustozdagi faol guruhlar (barcha filiallar). */
export async function getConflictCandidates(
  orgId: string,
  roomId: string | null,
  teacherId: string | null,
) {
  if (!roomId && !teacherId) return [];
  const supabase = await createClient();
  const ors = [roomId && `room_id.eq.${roomId}`, teacherId && `teacher_id.eq.${teacherId}`]
    .filter(Boolean)
    .join(",");
  const rows = unwrap(
    await supabase
      .from("groups")
      .select(
        "id, name, room_id, teacher_id, weekdays, start_time, end_time, start_date, end_date, room:rooms ( name ), teacher:staff ( profile:profiles ( full_name ) )",
      )
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .or(ors),
  );
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    roomId: g.room_id,
    teacherId: g.teacher_id,
    roomName: g.room?.name ?? null,
    teacherName: g.teacher?.profile?.full_name ?? null,
    weekdays: g.weekdays,
    startTime: normalizeTime(g.start_time),
    endTime: normalizeTime(g.end_time),
    startDate: g.start_date,
    endDate: g.end_date,
  }));
}

/** Haftalik jadval: filialning xonalari va shu hafta kunidagi faol guruhlari. */
export async function getWeeklySchedule(orgId: string, branchId: string, weekday: number) {
  const supabase = await createClient();
  const [rooms, groups, org] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("branch_id", branchId)
      .order("name"),
    supabase
      .from("groups")
      .select(
        "id, name, room_id, start_time, end_time, course:courses ( name ), teacher:staff ( profile:profiles ( full_name ) )",
      )
      .eq("organization_id", orgId)
      .eq("branch_id", branchId)
      .eq("is_active", true)
      .contains("weekdays", [weekday])
      .order("start_time"),
    supabase.from("organizations").select("work_start, work_end").eq("id", orgId).single(),
  ]);
  const o = unwrap(org);
  return {
    rooms: unwrap(rooms),
    groups: unwrap(groups).map((g) => ({
      id: g.id,
      name: g.name,
      roomId: g.room_id,
      startTime: normalizeTime(g.start_time),
      endTime: normalizeTime(g.end_time),
      courseName: g.course?.name ?? "",
      teacherName: g.teacher?.profile?.full_name ?? null,
    })),
    workStart: normalizeTime(o.work_start ?? "08:00"),
    workEnd: normalizeTime(o.work_end ?? "22:00"),
  };
}
