import { describe, expect, it } from "vitest";

import {
  type ExistingLesson,
  type GroupSchedule,
  type OtherGroup,
  addMinutes,
  dateRangesOverlap,
  findConflicts,
  generateLessons,
  lessonWindow,
  normalizeTime,
  planLessonSync,
  timesOverlap,
  toMinutes,
} from "./schedule";

// Du-Chor-Ju 14:00–15:30
const duChorJu: GroupSchedule = {
  weekdays: [1, 3, 5],
  startTime: "14:00:00",
  endTime: "15:30:00",
  startDate: "2026-09-01",
  endDate: null,
};

describe("vaqt yordamchilari", () => {
  it("normalizeTime", () => {
    expect(normalizeTime("9:05")).toBe("09:05");
    expect(normalizeTime("14:00:00")).toBe("14:00");
    expect(() => normalizeTime("24:00")).toThrow(RangeError);
    expect(() => normalizeTime("abc")).toThrow(RangeError);
  });

  it("toMinutes / addMinutes", () => {
    expect(toMinutes("12:30")).toBe(750);
    expect(addMinutes("12:00", 90)).toBe("13:30");
    expect(addMinutes("23:00", 120)).toBe("23:59");
  });

  it("timesOverlap — yarim ochiq oraliq", () => {
    expect(timesOverlap("12:00", "13:30", "13:00", "14:00")).toBe(true);
    expect(timesOverlap("12:00", "13:30", "13:30", "15:00")).toBe(false);
    expect(timesOverlap("12:00", "13:30", "11:00", "12:00")).toBe(false);
    expect(timesOverlap("12:00", "13:30", "12:30", "13:00")).toBe(true);
  });

  it("dateRangesOverlap — null cheksiz", () => {
    expect(dateRangesOverlap("2026-10-01", null, "2026-01-01", "2026-09-30")).toBe(false);
    expect(dateRangesOverlap("2026-10-01", null, "2026-01-01", "2026-10-01")).toBe(true);
    expect(dateRangesOverlap("2026-10-01", "2026-10-31", "2026-11-01", null)).toBe(false);
    expect(dateRangesOverlap("2026-10-01", null, "2027-01-01", null)).toBe(true);
  });
});

describe("generateLessons", () => {
  it("ROADMAP mezoni: Du-Chor-Ju guruhi oktabr 2026 da 13 ta dars", () => {
    const lessons = generateLessons(duChorJu, "2026-10-01", "2026-10-31");
    expect(lessons).toHaveLength(13);
    expect(lessons.map((l) => l.date)).toEqual([
      "2026-10-02",
      "2026-10-05",
      "2026-10-07",
      "2026-10-09",
      "2026-10-12",
      "2026-10-14",
      "2026-10-16",
      "2026-10-19",
      "2026-10-21",
      "2026-10-23",
      "2026-10-26",
      "2026-10-28",
      "2026-10-30",
    ]);
    expect(lessons[0]).toEqual({
      date: "2026-10-02",
      startTime: "14:00",
      endTime: "15:30",
      status: "scheduled",
      cancelReason: null,
      holidayId: null,
    });
  });

  it("bayram qo'shilsa 12 ta faol dars qoladi, bayramdagisi bekor holatida", () => {
    const holiday = { id: "h1", date: "2026-10-14", reason: "Bayram" };
    const lessons = generateLessons(duChorJu, "2026-10-01", "2026-10-31", [holiday]);
    expect(lessons).toHaveLength(13);
    expect(lessons.filter((l) => l.status === "scheduled")).toHaveLength(12);
    expect(lessons.find((l) => l.date === "2026-10-14")).toMatchObject({
      status: "cancelled",
      cancelReason: "Bayram",
      holidayId: "h1",
    });
  });

  it("dars kuniga to'g'ri kelmaydigan bayram hech narsani o'zgartirmaydi", () => {
    const lessons = generateLessons(duChorJu, "2026-10-01", "2026-10-31", [
      { id: "h", date: "2026-10-13", reason: "Seshanba" },
    ]);
    expect(lessons.every((l) => l.status === "scheduled")).toBe(true);
  });

  it("guruh boshlanish va tugash sanasi hisobga olinadi", () => {
    const g = { ...duChorJu, startDate: "2026-10-15", endDate: "2026-10-23" };
    expect(generateLessons(g, "2026-10-01", "2026-10-31").map((l) => l.date)).toEqual([
      "2026-10-16",
      "2026-10-19",
      "2026-10-21",
      "2026-10-23",
    ]);
  });

  it("oraliq bo'sh yoki guruh tugagan bo'lsa — bo'sh", () => {
    expect(generateLessons(duChorJu, "2026-10-31", "2026-10-01")).toEqual([]);
    expect(
      generateLessons({ ...duChorJu, endDate: "2026-09-30" }, "2026-10-01", "2026-10-31"),
    ).toEqual([]);
  });

  it("oy chegarasi va fevral (Se-Pa guruhi, fevral 2027)", () => {
    const g = { ...duChorJu, weekdays: [2, 4], startDate: "2027-01-01" };
    // 2027-02: seshanbalar 2,9,16,23; payshanbalar 4,11,18,25
    expect(generateLessons(g, "2027-02-01", "2027-02-28")).toHaveLength(8);
  });

  it("yakshanba (7) ham ishlaydi", () => {
    const g = { ...duChorJu, weekdays: [7] };
    expect(generateLessons(g, "2026-10-01", "2026-10-31").map((l) => l.date)).toEqual([
      "2026-10-04",
      "2026-10-11",
      "2026-10-18",
      "2026-10-25",
    ]);
  });

  it("lessonWindow — 60 kun", () => {
    expect(lessonWindow("2026-10-02")).toEqual(["2026-10-02", "2026-12-01"]);
  });
});

describe("planLessonSync", () => {
  const today = "2026-10-10";
  const planned = generateLessons(duChorJu, today, "2026-10-20");
  // 12, 14, 16, 19 oktabr

  function existing(date: string, extra: Partial<ExistingLesson> = {}): ExistingLesson {
    return {
      id: `l-${date}`,
      date,
      startTime: "14:00:00",
      endTime: "15:30:00",
      status: "scheduled",
      holidayId: null,
      hasAttendance: false,
      ...extra,
    };
  }

  it("yo'q darslar qo'shiladi, borlariga tegilmaydi", () => {
    const plan = planLessonSync([existing("2026-10-12")], planned, today);
    expect(plan.insert.map((p) => p.date)).toEqual(["2026-10-14", "2026-10-16", "2026-10-19"]);
    expect(plan.remove).toEqual([]);
    expect(plan.update).toEqual([]);
  });

  it("jadval o'zgarsa: kelajakdagi ortiqcha dars o'chiriladi, o'tgani va davomatlisi qoladi", () => {
    const plan = planLessonSync(
      [
        existing("2026-10-08"), // o'tgan (from dan oldin)
        existing("2026-10-13"), // seshanba — endi jadvalda yo'q
        existing("2026-10-15", { hasAttendance: true }), // davomat bor
        existing("2026-10-17", { status: "held" }),
      ],
      planned,
      today,
    );
    expect(plan.remove).toEqual(["l-2026-10-13"]);
  });

  it("vaqt o'zgarsa: boshlanish vaqti boshqa — eski o'chadi, yangisi qo'shiladi", () => {
    const later = generateLessons(
      { ...duChorJu, startTime: "16:00", endTime: "17:30" },
      today,
      "2026-10-13",
    );
    const plan = planLessonSync([existing("2026-10-12")], later, today);
    expect(plan.remove).toEqual(["l-2026-10-12"]);
    expect(plan.insert).toEqual([
      expect.objectContaining({ date: "2026-10-12", startTime: "16:00" }),
    ]);
  });

  it("faqat tugash vaqti o'zgarsa — yangilanadi", () => {
    const longer = generateLessons({ ...duChorJu, endTime: "16:00" }, today, "2026-10-12");
    const plan = planLessonSync([existing("2026-10-12")], longer, today);
    expect(plan.update).toEqual([
      {
        id: "l-2026-10-12",
        endTime: "16:00",
        status: "scheduled",
        cancelReason: null,
        holidayId: null,
      },
    ]);
  });

  it("bayram: rejali dars bekor bo'ladi, bayram olib tashlansa tiklanadi", () => {
    const h = { id: "h1", date: "2026-10-12", reason: "Bayram" };
    const withHoliday = generateLessons(duChorJu, today, "2026-10-12", [h]);
    expect(planLessonSync([existing("2026-10-12")], withHoliday, today).update).toEqual([
      {
        id: "l-2026-10-12",
        endTime: "15:30",
        status: "cancelled",
        cancelReason: "Bayram",
        holidayId: "h1",
      },
    ]);

    const noHoliday = generateLessons(duChorJu, today, "2026-10-12");
    const cancelled = existing("2026-10-12", { status: "cancelled", holidayId: "h1" });
    expect(planLessonSync([cancelled], noHoliday, today).update).toEqual([
      {
        id: "l-2026-10-12",
        endTime: "15:30",
        status: "scheduled",
        cancelReason: null,
        holidayId: null,
      },
    ]);
  });

  it("qo'lda bekor qilingan dars bekorligicha qoladi (sababi o'zgarmaydi)", () => {
    const manual = existing("2026-10-12", { status: "cancelled" });
    expect(planLessonSync([manual], planned, today).update).toEqual([]);
    const longer = generateLessons({ ...duChorJu, endTime: "16:00" }, today, "2026-10-12");
    expect(planLessonSync([manual], longer, today).update).toEqual([
      { id: "l-2026-10-12", endTime: "16:00", status: "cancelled", holidayId: null },
    ]);
  });
});

describe("findConflicts", () => {
  const other: OtherGroup = {
    id: "g10",
    name: "10-guruh",
    roomId: "room6",
    roomName: "6-xona",
    teacherId: "t1",
    teacherName: "Aziz Karimov",
    weekdays: [1, 3],
    startTime: "12:00:00",
    endTime: "13:30:00",
    startDate: "2026-09-01",
    endDate: null,
  };

  const candidate = {
    roomId: "room6",
    teacherId: "t2",
    weekdays: [1, 3, 5],
    startTime: "13:00",
    endTime: "14:30",
    startDate: "2026-10-01",
    endDate: null,
  };

  it("xona band — umumiy kunlar va boshqa guruh vaqti bilan", () => {
    expect(findConflicts(candidate, [other])).toEqual([
      {
        kind: "room",
        groupId: "g10",
        groupName: "10-guruh",
        resourceName: "6-xona",
        weekdays: [1, 3],
        startTime: "12:00",
        endTime: "13:30",
      },
    ]);
  });

  it("ustoz band (boshqa xonada bo'lsa ham)", () => {
    const c = { ...candidate, roomId: "room7", teacherId: "t1" };
    expect(findConflicts(c, [other]).map((x) => [x.kind, x.resourceName])).toEqual([
      ["teacher", "Aziz Karimov"],
    ]);
  });

  it("xona ham, ustoz ham band — ikkita to'qnashuv", () => {
    expect(findConflicts({ ...candidate, teacherId: "t1" }, [other])).toHaveLength(2);
  });

  it("to'qnashuv yo'q: vaqt tegib turadi, kun boshqa, sana kesishmaydi, xona/ustoz yo'q", () => {
    expect(findConflicts({ ...candidate, startTime: "13:30", endTime: "15:00" }, [other])).toEqual(
      [],
    );
    expect(findConflicts({ ...candidate, weekdays: [2, 4] }, [other])).toEqual([]);
    expect(findConflicts(candidate, [{ ...other, endDate: "2026-09-30" }])).toEqual([]);
    expect(findConflicts({ ...candidate, roomId: null, teacherId: null }, [other])).toEqual([]);
  });

  it("guruhning o'zi bilan to'qnashmaydi (tahrirlashda)", () => {
    expect(findConflicts({ ...other, id: "g10" }, [other])).toEqual([]);
  });
});
