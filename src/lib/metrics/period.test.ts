import { describe, expect, it } from "vitest";

import {
  changePercent,
  lastMonths,
  monthToDate,
  resolveReportPeriod,
  sameDayLastMonth,
  samePeriodLastMonth,
} from "./period";

describe("monthToDate", () => {
  it("oy boshidan bugungacha", () => {
    expect(monthToDate("2026-10-15")).toEqual({ from: "2026-10-01", to: "2026-10-15" });
    expect(monthToDate("2026-10-01")).toEqual({ from: "2026-10-01", to: "2026-10-01" });
  });
});

describe("sameDayLastMonth", () => {
  it("oddiy kun", () => {
    expect(sameDayLastMonth("2026-10-15")).toBe("2026-09-15");
  });
  it("yil chegarasi", () => {
    expect(sameDayLastMonth("2027-01-10")).toBe("2026-12-10");
  });
  it("o'tgan oyda bunday kun yo'q — oy oxiri", () => {
    expect(sameDayLastMonth("2026-03-31")).toBe("2026-02-28");
    expect(sameDayLastMonth("2028-03-30")).toBe("2028-02-29");
    expect(sameDayLastMonth("2026-10-31")).toBe("2026-09-30");
  });
});

describe("samePeriodLastMonth", () => {
  it("oy boshidan bugungacha ↔ o'tgan oyning shu kunlari", () => {
    expect(samePeriodLastMonth({ from: "2026-10-01", to: "2026-10-15" })).toEqual({
      from: "2026-09-01",
      to: "2026-09-15",
    });
  });
  it("to'liq oy 31 kun → o'tgan oy oxirigacha", () => {
    expect(samePeriodLastMonth({ from: "2026-03-01", to: "2026-03-31" })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });
});

describe("changePercent", () => {
  it("o'sish va kamayish", () => {
    expect(changePercent(120, 100)).toBe(20);
    expect(changePercent(75, 100)).toBe(-25);
    expect(changePercent(100, 100)).toBe(0);
  });
  it("bir xona aniqlik", () => {
    expect(changePercent(2, 3)).toBe(-33.3);
    expect(changePercent(1_000_001, 3)).toBe(33333266.7);
  });
  it("oldingi 0 — solishtirib bo'lmaydi", () => {
    expect(changePercent(5, 0)).toBeNull();
    expect(changePercent(0, 0)).toBeNull();
  });
  it("manfiy qiymat (qarz): qarz oshsa — modul bo'yicha", () => {
    expect(changePercent(-150, -100)).toBe(-50);
    expect(changePercent(-50, -100)).toBe(50);
  });
});

describe("lastMonths", () => {
  it("joriy oy bilan, eskisidan", () => {
    expect(lastMonths("2026-02-10", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("resolveReportPeriod", () => {
  const today = "2026-10-15";
  it("tayyor variantlar", () => {
    expect(resolveReportPeriod("month", today)).toEqual({
      preset: "month",
      from: "2026-10-01",
      to: "2026-10-15",
    });
    expect(resolveReportPeriod("last_month", today)).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(resolveReportPeriod("quarter", today)).toMatchObject({
      from: "2026-08-01",
      to: "2026-10-15",
    });
    expect(resolveReportPeriod("year", today)).toMatchObject({ from: "2026-01-01", to: today });
    expect(resolveReportPeriod("last_month", "2027-01-05")).toMatchObject({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });
  it("qo'lda: kelajak bugun bilan kesiladi", () => {
    expect(resolveReportPeriod("custom", today, { from: "2026-09-10", to: "2026-12-31" })).toEqual({
      preset: "custom",
      from: "2026-09-10",
      to: "2026-10-15",
    });
  });
  it("qo'lda: noto'g'ri yoki juda uzun davr — shu oy", () => {
    const month = { preset: "month", from: "2026-10-01", to: today };
    expect(resolveReportPeriod("custom", today, { from: "2026-10-10", to: "2026-10-01" })).toEqual(
      month,
    );
    expect(resolveReportPeriod("custom", today, { from: null, to: "2026-10-01" })).toEqual(month);
    expect(resolveReportPeriod("custom", today, { from: "2024-10-31", to: today })).toEqual(month);
    expect(resolveReportPeriod("custom", today, { from: "2024-11-01", to: today })).toMatchObject({
      preset: "custom",
    });
  });
});
