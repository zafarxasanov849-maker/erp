/**
 * Davomat qoidalari — toza funksiyalar (PRD §3.5, ROADMAP 4-bosqich).
 * Bazadagi set_attendance() / enrollment_absence_streaks bilan bir xil mantiq.
 */
import { type IsoDate, addDays } from "./dates";

export const ATTENDANCE_STATUSES = ["present", "late", "absent", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type Mark = AttendanceStatus | null;

/** Katakni bosish: bo'sh → Keldi → Kechikdi → Kelmadi → Sababli → bo'sh */
export function nextStatus(current: Mark): Mark {
  if (current === null) return "present";
  const i = ATTENDANCE_STATUSES.indexOf(current);
  return ATTENDANCE_STATUSES[i + 1] ?? null;
}

export interface MemberSpan {
  joinedAt: IsoDate;
  leftAt: IsoDate | null;
  /** [from, to] — ikkala chegara ham kiradi */
  freezes: readonly (readonly [IsoDate, IsoDate])[];
}

/** Dars kuni guruh a'zosimi (qo'shilgan..chiqqan, chegaralar bilan) */
export function isMemberOn(m: MemberSpan, date: IsoDate): boolean {
  return m.joinedAt <= date && (m.leftAt === null || m.leftAt >= date);
}

export function isFrozenOn(m: MemberSpan, date: IsoDate): boolean {
  return m.freezes.some(([from, to]) => from <= date && date <= to);
}

/**
 * Dars belgilanishi mumkinmi: bekor qilinmagan, kelajakda emas va (ustoz uchun) muddat ichida.
 * editDays null — cheklovsiz (attendance.manage).
 */
export function lessonEditable(
  lesson: { date: IsoDate; status: "scheduled" | "held" | "cancelled" },
  today: IsoDate,
  editDays: number | null,
): "ok" | "cancelled" | "future" | "closed" {
  if (lesson.status === "cancelled") return "cancelled";
  if (lesson.date > today) return "future";
  if (editDays !== null && today > addDays(lesson.date, editDays)) return "closed";
  return "ok";
}

/**
 * Ketma-ket "Kelmadi" soni: eng oxirgi belgidan boshlab.
 * Keldi/Kechikdi — to'xtatadi; Sababli — o'tkazib yuboriladi.
 */
export function absenceStreak(
  marks: readonly { date: IsoDate; startTime: string; status: AttendanceStatus }[],
): number {
  const sorted = [...marks].sort((a, b) =>
    a.date === b.date ? b.startTime.localeCompare(a.startTime) : b.date.localeCompare(a.date),
  );
  let streak = 0;
  for (const m of sorted) {
    if (m.status === "excused") continue;
    if (m.status !== "absent") break;
    streak++;
  }
  return streak;
}

export function summarize(statuses: readonly AttendanceStatus[]): Record<AttendanceStatus, number> {
  const out = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const s of statuses) out[s]++;
  return out;
}
