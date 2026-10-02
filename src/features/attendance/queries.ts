import "server-only";

import type { AttendanceStatus } from "@/lib/attendance";
import { unwrap } from "@/lib/action";
import type { IsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export interface JournalLesson {
  id: string;
  date: IsoDate;
  startTime: string;
  endTime: string;
  status: "scheduled" | "held" | "cancelled";
  cancelReason: string | null;
  topic: string | null;
  homework: string | null;
}

export interface JournalStudent {
  enrollmentId: string;
  studentId: string;
  fullName: string;
  status: "trial" | "active" | "frozen" | "left";
  joinedAt: IsoDate;
  leftAt: IsoDate | null;
  freezes: [IsoDate, IsoDate][];
}

export interface JournalMark {
  lessonId: string;
  enrollmentId: string;
  status: AttendanceStatus;
  lateMarked: boolean;
  editedAfter: boolean;
}

export interface Journal {
  today: IsoDate;
  canEdit: boolean;
  /** null — cheklovsiz (attendance.manage) */
  editDays: number | null;
  lessons: JournalLesson[];
  students: JournalStudent[];
  marks: JournalMark[];
}

interface RawJournal {
  today: string;
  can_edit: boolean;
  edit_days: number | null;
  lessons: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: JournalLesson["status"];
    cancel_reason: string | null;
    topic: string | null;
    homework: string | null;
  }[];
  students: {
    enrollment_id: string;
    student_id: string;
    full_name: string;
    status: JournalStudent["status"];
    joined_at: string;
    left_at: string | null;
    freezes: [string, string][];
  }[];
  marks: {
    lesson_id: string;
    enrollment_id: string;
    status: AttendanceStatus;
    late_marked: boolean;
    edited_after: boolean;
  }[];
}

/** Guruh jurnali (RPC: ustozda students.view bo'lmasa ham ismlar ko'rinadi) */
export async function getJournal(groupId: string, from: IsoDate, to: IsoDate): Promise<Journal> {
  const supabase = await createClient();
  const raw = unwrap(
    await supabase.rpc("group_journal", { p_group: groupId, p_from: from, p_to: to }),
  ) as unknown as RawJournal;
  return {
    today: raw.today,
    canEdit: raw.can_edit,
    editDays: raw.edit_days,
    lessons: raw.lessons.map((l) => ({
      id: l.id,
      date: l.date,
      startTime: l.start_time,
      endTime: l.end_time,
      status: l.status,
      cancelReason: l.cancel_reason,
      topic: l.topic,
      homework: l.homework,
    })),
    students: raw.students.map((s) => ({
      enrollmentId: s.enrollment_id,
      studentId: s.student_id,
      fullName: s.full_name,
      status: s.status,
      joinedAt: s.joined_at,
      leftAt: s.left_at,
      freezes: s.freezes,
    })),
    marks: raw.marks.map((m) => ({
      lessonId: m.lesson_id,
      enrollmentId: m.enrollment_id,
      status: m.status,
      lateMarked: m.late_marked,
      editedAfter: m.edited_after,
    })),
  };
}

export async function getLesson(lessonId: string) {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("lessons")
      .select("id, group_id, date, organization_id, group:groups ( id, name, branch_id )")
      .eq("id", lessonId)
      .maybeSingle(),
  );
}

/** Kun darslari: branchId null — barcha filiallar */
export async function getDayLessons(orgId: string, date: IsoDate, branchId: string | null) {
  const supabase = await createClient();
  return unwrap(
    await supabase.rpc("day_lessons", {
      p_org: orgId,
      p_date: date,
      ...(branchId ? { p_branch: branchId } : {}),
    }),
  );
}

export type DayLesson = Awaited<ReturnType<typeof getDayLessons>>[number];

export async function getAbsentees(orgId: string, branchId: string | null) {
  const supabase = await createClient();
  return unwrap(
    await supabase.rpc("absentees", { p_org: orgId, ...(branchId ? { p_branch: branchId } : {}) }),
  );
}

export type Absentee = Awaited<ReturnType<typeof getAbsentees>>[number];

/** Talaba profili: oxirgi belgilar (attendance_read: attendance.view + guruhni ko'rish) */
export async function getStudentAttendance(studentId: string, from: IsoDate) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from("attendance")
      .select(
        "status, late_marked, lesson:lessons!inner ( date, start_time, group_id ), enrollment:enrollments!inner ( student_id, group:groups ( id, name ) )",
      )
      .eq("enrollment.student_id", studentId)
      .gte("lesson.date", from),
  );
  return rows
    .map((r) => ({
      status: r.status as AttendanceStatus,
      lateMarked: r.late_marked,
      date: r.lesson.date,
      startTime: r.lesson.start_time.slice(0, 5),
      groupId: r.enrollment.group?.id ?? r.lesson.group_id,
      groupName: r.enrollment.group?.name ?? "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
}

export type StudentAttendanceRow = Awaited<ReturnType<typeof getStudentAttendance>>[number];

export interface AttendanceSettings {
  teacherEditDays: number;
  absenceThreshold: number;
  /** Moliya (PRD §5.4, §5.6, §5.9) */
  rounding: 1 | 100 | 1000;
  refundOnLeave: boolean;
  trialLessons: number;
}

/** organizations.settings: davomat (2 kun, 3 dars) va moliya (1 so'm, qaytarilsin, 2 sinov darsi) */
export async function getAttendanceSettings(orgId: string): Promise<AttendanceSettings> {
  const supabase = await createClient();
  const org = unwrap(
    await supabase.from("organizations").select("settings").eq("id", orgId).single(),
  );
  const s = (org.settings ?? {}) as Record<string, unknown>;
  const int = (v: unknown, d: number) => (Number.isInteger(v) ? (v as number) : d);
  return {
    teacherEditDays: int(s.teacher_edit_days, 2),
    absenceThreshold: int(s.absence_threshold, 3),
    rounding: s.rounding === 100 || s.rounding === 1000 ? s.rounding : 1,
    refundOnLeave: s.refund_on_leave !== false,
    trialLessons: int(s.trial_lessons, 2),
  };
}
