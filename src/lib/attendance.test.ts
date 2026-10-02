import { describe, expect, it } from "vitest";

import {
  absenceStreak,
  isFrozenOn,
  isMemberOn,
  lessonEditable,
  nextStatus,
  summarize,
} from "./attendance";

describe("nextStatus", () => {
  it("bo'sh → Keldi → Kechikdi → Kelmadi → Sababli → bo'sh", () => {
    const seen = [];
    let s = nextStatus(null);
    for (let i = 0; i < 5; i++) {
      seen.push(s);
      s = nextStatus(s);
    }
    expect(seen).toEqual(["present", "late", "absent", "excused", null]);
  });
});

describe("a'zolik", () => {
  const m = {
    joinedAt: "2026-10-05",
    leftAt: "2026-10-20",
    freezes: [["2026-10-10", "2026-10-12"]] as const,
  };

  it("qo'shilgan va chiqqan kunlar kiradi", () => {
    expect(isMemberOn(m, "2026-10-04")).toBe(false);
    expect(isMemberOn(m, "2026-10-05")).toBe(true);
    expect(isMemberOn(m, "2026-10-20")).toBe(true);
    expect(isMemberOn(m, "2026-10-21")).toBe(false);
    expect(isMemberOn({ ...m, leftAt: null }, "2027-01-01")).toBe(true);
  });

  it("muzlatish chegaralari kiradi", () => {
    expect(isFrozenOn(m, "2026-10-09")).toBe(false);
    expect(isFrozenOn(m, "2026-10-10")).toBe(true);
    expect(isFrozenOn(m, "2026-10-12")).toBe(true);
    expect(isFrozenOn(m, "2026-10-13")).toBe(false);
  });
});

describe("lessonEditable", () => {
  const today = "2026-10-10";
  const l = (date: string, status: "scheduled" | "held" | "cancelled" = "scheduled") => ({
    date,
    status,
  });

  it("bekor qilingan va kelajakdagi dars belgilanmaydi", () => {
    expect(lessonEditable(l("2026-10-10", "cancelled"), today, null)).toBe("cancelled");
    expect(lessonEditable(l("2026-10-11"), today, null)).toBe("future");
  });

  it("ustoz: dars sanasidan N kun ichida", () => {
    expect(lessonEditable(l("2026-10-08"), today, 2)).toBe("ok");
    expect(lessonEditable(l("2026-10-07"), today, 2)).toBe("closed");
    expect(lessonEditable(l("2026-10-10"), today, 0)).toBe("ok");
  });

  it("admin (null) — cheklovsiz", () => {
    expect(lessonEditable(l("2025-01-01", "held"), today, null)).toBe("ok");
  });
});

describe("absenceStreak", () => {
  const m = (
    date: string,
    status: "present" | "late" | "absent" | "excused",
    startTime = "14:00",
  ) => ({
    date,
    startTime,
    status,
  });

  it("oxirgi belgilardan ketma-ket Kelmadi", () => {
    expect(
      absenceStreak([
        m("2026-10-01", "present"),
        m("2026-10-03", "absent"),
        m("2026-10-05", "absent"),
      ]),
    ).toBe(2);
  });

  it("Sababli o'tkazib yuboriladi, Kechikdi to'xtatadi", () => {
    expect(
      absenceStreak([
        m("2026-10-01", "late"),
        m("2026-10-02", "absent"),
        m("2026-10-03", "excused"),
        m("2026-10-04", "absent"),
        m("2026-10-05", "absent"),
      ]),
    ).toBe(3);
  });

  it("oxirgisi Keldi bo'lsa — 0; tartibsiz kirish ham saralanadi", () => {
    expect(absenceStreak([m("2026-10-05", "present"), m("2026-10-04", "absent")])).toBe(0);
    expect(
      absenceStreak([
        m("2026-10-04", "absent"),
        m("2026-10-05", "absent", "09:00"),
        m("2026-10-05", "present", "08:00"),
      ]),
    ).toBe(1);
    expect(absenceStreak([])).toBe(0);
  });
});

it("summarize", () => {
  expect(summarize(["present", "present", "absent", "excused"])).toEqual({
    present: 2,
    late: 0,
    absent: 1,
    excused: 1,
  });
});
