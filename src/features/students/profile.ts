import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

import type { HistoryEntry, HistoryLookups } from "./history";
import type { EnrollmentStatus, StudentStatus } from "./schema";

export const PHOTO_BUCKET = "student-photos";

export async function getStudent(orgId: string, studentId: string) {
  const supabase = await createClient();
  const [student, overview, tags] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, branch_id, full_name, phone, gender, birth_date, photo_url, parent_name, parent_phone, telegram_username, address, school, passport_series, joined_at, archived_at, branch:branches ( name )",
      )
      .eq("organization_id", orgId)
      .eq("id", studentId)
      .maybeSingle(),
    supabase.from("students_overview").select("status").eq("id", studentId).maybeSingle(),
    supabase
      .from("student_tags")
      .select("tag:tags ( id, name, color )")
      .eq("student_id", studentId),
  ]);
  const s = unwrap(student);
  if (!s) return null;

  let photoUrl: string | null = null;
  if (s.photo_url) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(s.photo_url, 3600);
    photoUrl = data?.signedUrl ?? null;
  }
  return {
    ...s,
    photoUrl,
    status: (unwrap(overview)?.status ?? "new") as StudentStatus,
    tags: unwrap(tags).flatMap((r) => (r.tag ? [r.tag] : [])),
  };
}

export type StudentProfile = NonNullable<Awaited<ReturnType<typeof getStudent>>>;

export interface FreezeRow {
  id: string;
  from: string;
  to: string;
  reasonName: string | null;
}

export interface EnrollmentRow {
  id: string;
  status: EnrollmentStatus;
  joinedAt: string;
  activatedAt: string | null;
  leftAt: string | null;
  leaveReason: string | null;
  group: {
    id: string;
    name: string;
    isActive: boolean;
    courseName: string;
    teacherName: string | null;
    weekdays: number[];
    startTime: string;
    endTime: string;
  };
  freezes: FreezeRow[];
}

export async function listStudentEnrollments(studentId: string): Promise<EnrollmentRow[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("enrollments")
      .select(
        `id, status, joined_at, activated_at, left_at, created_at,
         leave_reason:reasons ( name ),
         group:groups ( id, name, is_active, weekdays, start_time, end_time,
           course:courses ( name ), teacher:staff ( profile:profiles ( full_name ) ) ),
         freezes ( id, date_from, date_to, reason:reasons ( name ) )`,
      )
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  );
  return rows.flatMap((e) =>
    e.group
      ? [
          {
            id: e.id,
            status: e.status as EnrollmentStatus,
            joinedAt: e.joined_at,
            activatedAt: e.activated_at,
            leftAt: e.left_at,
            leaveReason: e.leave_reason?.name ?? null,
            group: {
              id: e.group.id,
              name: e.group.name,
              isActive: e.group.is_active,
              courseName: e.group.course?.name ?? "",
              teacherName: e.group.teacher?.profile?.full_name ?? null,
              weekdays: e.group.weekdays,
              startTime: e.group.start_time.slice(0, 5),
              endTime: e.group.end_time.slice(0, 5),
            },
            freezes: e.freezes
              .map((f) => ({
                id: f.id,
                from: f.date_from,
                to: f.date_to,
                reasonName: f.reason?.name ?? null,
              }))
              .sort((a, b) => b.from.localeCompare(a.from)),
          },
        ]
      : [],
  );
}

export async function listStudentNotes(studentId: string) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("student_notes")
      .select("id, body, created_at, created_by, author:staff ( profile:profiles ( full_name ) )")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  );
  return rows.map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.created_at,
    createdBy: n.created_by,
    authorName: n.author?.profile?.full_name ?? null,
  }));
}

export type NoteRow = Awaited<ReturnType<typeof listStudentNotes>>[number];

/** O'zgarishlar tarixi va uni o'qish uchun nomlar (guruh, teg, sabab, filial) */
export async function getStudentHistory(
  orgId: string,
  studentId: string,
  enrollments: readonly EnrollmentRow[],
): Promise<{ entries: HistoryEntry[]; lookups: HistoryLookups }> {
  const supabase = await createClient();
  const [history, groups, tags, reasons, branches] = await Promise.all([
    supabase.rpc("student_history", { p_student: studentId }),
    supabase.from("groups").select("id, name").eq("organization_id", orgId),
    supabase.from("tags").select("id, name").eq("organization_id", orgId),
    supabase.from("reasons").select("id, name").eq("organization_id", orgId),
    supabase.from("branches").select("id, name").eq("organization_id", orgId),
  ]);
  const names = (rows: { id: string; name: string }[]) =>
    Object.fromEntries(rows.map((r) => [r.id, r.name]));
  return {
    entries: unwrap(history).map((h) => ({
      id: h.id,
      createdAt: h.created_at,
      action: h.action,
      entity: h.entity,
      entityId: h.entity_id,
      diff: (h.diff ?? {}) as Record<string, unknown>,
      actorName: h.actor_name,
    })),
    lookups: {
      groups: names(unwrap(groups)),
      tags: names(unwrap(tags)),
      reasons: names(unwrap(reasons)),
      branches: names(unwrap(branches)),
      enrollmentGroups: Object.fromEntries(enrollments.map((e) => [e.id, e.group.id])),
    },
  };
}
