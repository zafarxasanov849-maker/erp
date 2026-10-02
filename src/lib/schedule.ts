/**
 * Guruh jadvali va darslar — toza funksiyalar (DB va vaqt zonasiga bog'liq emas).
 * Sanalar "YYYY-MM-DD" (Toshkent kalendari), vaqtlar "HH:mm" yoki "HH:mm:ss".
 * Hafta kunlari ISO: 1 = Du … 7 = Ya (groups.weekdays bilan bir xil).
 */
import { type IsoDate, addDays, eachDay, isoWeekday, maxDate, minDate } from "./dates";

/** Darslar shuncha kun oldindan yaratiladi (PRD §3.4). */
export const LESSON_HORIZON_DAYS = 60;

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface GroupSchedule {
  weekdays: readonly number[];
  startTime: string;
  endTime: string;
  startDate: IsoDate;
  endDate: IsoDate | null;
}

export interface HolidayRef {
  id: string;
  date: IsoDate;
  reason: string;
}

export interface PlannedLesson {
  date: IsoDate;
  startTime: string; // "HH:mm"
  endTime: string;
  status: "scheduled" | "cancelled";
  cancelReason: string | null;
  holidayId: string | null;
}

/** "9:05" / "09:05:00" → "09:05" */
export function normalizeTime(value: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!m) throw new RangeError(`Invalid time: ${value}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new RangeError(`Invalid time: ${value}`);
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export function toMinutes(value: string): number {
  const [h, m] = normalizeTime(value).split(":").map(Number);
  return h! * 60 + m!;
}

export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

/** Boshlanish vaqtiga daqiqa qo'shish (kun chegarasidan oshmaydi). */
export function addMinutes(time: string, minutes: number): string {
  return fromMinutes(toMinutes(time) + minutes);
}

/** Yarim ochiq oraliqlar: 12:00–13:30 va 13:30–15:00 to'qnashmaydi. */
export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

/** Sana oraliqlari (ikkala chet ham kiradi, null — cheksiz). */
export function dateRangesOverlap(
  aStart: IsoDate,
  aEnd: IsoDate | null,
  bStart: IsoDate,
  bEnd: IsoDate | null,
): boolean {
  return (bEnd === null || aStart <= bEnd) && (aEnd === null || bStart <= aEnd);
}

/**
 * Guruh darslarini [from, to] oralig'ida rejalashtiradi (PRD §5.1 asosi).
 * Bayram kunidagi darslar o'chirilmaydi — "cancelled" holatida qaytadi (jurnalda kulrang).
 */
export function generateLessons(
  group: GroupSchedule,
  from: IsoDate,
  to: IsoDate,
  holidays: readonly HolidayRef[] = [],
): PlannedLesson[] {
  const start = maxDate(from, group.startDate);
  const end = group.endDate ? minDate(to, group.endDate) : to;
  if (start > end) return [];

  const weekdays = new Set(group.weekdays);
  const byDate = new Map(holidays.map((h) => [h.date, h]));
  const startTime = normalizeTime(group.startTime);
  const endTime = normalizeTime(group.endTime);

  return eachDay(start, end)
    .filter((d) => weekdays.has(isoWeekday(d)))
    .map((date) => {
      const holiday = byDate.get(date);
      return {
        date,
        startTime,
        endTime,
        status: holiday ? "cancelled" : "scheduled",
        cancelReason: holiday ? holiday.reason : null,
        holidayId: holiday ? holiday.id : null,
      };
    });
}

/** Rejalashtirish oynasi: bugundan LESSON_HORIZON_DAYS kun. */
export function lessonWindow(today: IsoDate): [IsoDate, IsoDate] {
  return [today, addDays(today, LESSON_HORIZON_DAYS)];
}

// ---------- Mavjud darslar bilan solishtirish ----------

export interface ExistingLesson {
  id: string;
  date: IsoDate;
  startTime: string;
  endTime: string;
  status: "scheduled" | "held" | "cancelled";
  holidayId: string | null;
  hasAttendance: boolean;
}

export interface LessonSyncPlan {
  insert: PlannedLesson[];
  /** Kelajakdagi, davomatsiz, jadvalga endi to'g'ri kelmaydigan darslar. */
  remove: string[];
  /** cancelReason: undefined — o'zgartirilmaydi (qo'lda bekor qilingan dars sababi saqlanadi). */
  update: {
    id: string;
    endTime: string;
    status: "scheduled" | "cancelled";
    cancelReason?: string | null;
    holidayId: string | null;
  }[];
}

/**
 * Jadval o'zgarganda yoki cron'da: rejadagi va bazadagi darslarni solishtiradi.
 * Faqat `from` dan keyingi, davomati yo'q, o'tmagan ("held" emas) darslarga tegiladi.
 * Qo'lda bekor qilingan dars (bayramsiz "cancelled") bekorligicha qoladi.
 */
export function planLessonSync(
  existing: readonly ExistingLesson[],
  planned: readonly PlannedLesson[],
  from: IsoDate,
): LessonSyncPlan {
  const key = (date: string, start: string) => `${date} ${normalizeTime(start)}`;
  const plannedByKey = new Map(planned.map((p) => [key(p.date, p.startTime), p]));
  const existingKeys = new Set(existing.map((e) => key(e.date, e.startTime)));
  const plan: LessonSyncPlan = { insert: [], remove: [], update: [] };

  for (const e of existing) {
    const locked = e.date < from || e.hasAttendance || e.status === "held";
    if (locked) continue;
    const p = plannedByKey.get(key(e.date, e.startTime));
    if (!p) {
      plan.remove.push(e.id);
      continue;
    }
    const endTime = normalizeTime(p.endTime);
    const manuallyCancelled = e.status === "cancelled" && e.holidayId === null;
    if (manuallyCancelled && p.holidayId === null) {
      // qo'lda bekor qilingan — bekorligicha qoladi, faqat vaqti yangilanadi
      if (normalizeTime(e.endTime) !== endTime) {
        plan.update.push({ id: e.id, endTime, status: "cancelled", holidayId: null });
      }
      continue;
    }
    if (
      e.status !== p.status ||
      e.holidayId !== p.holidayId ||
      normalizeTime(e.endTime) !== endTime
    ) {
      plan.update.push({
        id: e.id,
        endTime,
        status: p.status,
        cancelReason: p.cancelReason,
        holidayId: p.holidayId,
      });
    }
  }

  for (const p of planned) {
    if (p.date >= from && !existingKeys.has(key(p.date, p.startTime))) plan.insert.push(p);
  }
  return plan;
}

// ---------- To'qnashuvlar ----------

export interface GroupSlot extends GroupSchedule {
  id?: string;
  roomId: string | null;
  teacherId: string | null;
}

export interface OtherGroup extends GroupSlot {
  id: string;
  name: string;
  roomName: string | null;
  teacherName: string | null;
}

export interface ScheduleConflict {
  kind: "room" | "teacher";
  groupId: string;
  groupName: string;
  /** Xona nomi yoki ustoz ismi */
  resourceName: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
}

/**
 * Xona yoki ustoz bir vaqtda boshqa guruhda bandmi (faqat faol guruhlarni bering).
 * Mezon: umumiy hafta kuni + vaqt kesishadi + sana oraliqlari kesishadi.
 */
export function findConflicts(
  candidate: GroupSlot,
  others: readonly OtherGroup[],
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (const o of others) {
    if (candidate.id && o.id === candidate.id) continue;
    const days = candidate.weekdays.filter((d) => o.weekdays.includes(d)).sort((a, b) => a - b);
    if (days.length === 0) continue;
    if (!timesOverlap(candidate.startTime, candidate.endTime, o.startTime, o.endTime)) continue;
    if (!dateRangesOverlap(candidate.startDate, candidate.endDate, o.startDate, o.endDate))
      continue;

    const base = {
      groupId: o.id,
      groupName: o.name,
      weekdays: days,
      startTime: normalizeTime(o.startTime),
      endTime: normalizeTime(o.endTime),
    };
    if (candidate.roomId && o.roomId === candidate.roomId) {
      conflicts.push({ ...base, kind: "room", resourceName: o.roomName ?? "" });
    }
    if (candidate.teacherId && o.teacherId === candidate.teacherId) {
      conflicts.push({ ...base, kind: "teacher", resourceName: o.teacherName ?? "" });
    }
  }
  return conflicts;
}
