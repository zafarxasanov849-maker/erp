import { describe, expect, it } from "vitest";

import {
  type GroupDayStat,
  type SalaryEntry,
  type SalaryRule,
  computeSalary,
  ruleWindow,
  salaryLines,
  summarizeSalary,
} from "./calc";

const T = "teacher-1";
const M = "2026-10"; // 31 kun

function rule(over: Partial<SalaryRule>): SalaryRule {
  return {
    id: "r1",
    type: "fixed_monthly",
    amount: null,
    percent: null,
    groupId: null,
    validFrom: "2026-01-01",
    validTo: null,
    ...over,
  };
}

function stat(groupId: string, day: string, revenue: number, markedLessons = 0, teacherId = T) {
  return { groupId, groupName: groupId, teacherId, day, revenue, markedLessons } as GroupDayStat;
}

function entry(
  kind: SalaryEntry["kind"],
  amount: number,
  over: Partial<SalaryEntry> = {},
): SalaryEntry {
  return {
    id: kind + amount,
    kind,
    amount,
    voided: false,
    createdAt: "2026-10-05T10:00:00Z",
    ...over,
  };
}

const total = (rules: SalaryRule[], stats: GroupDayStat[] = []) =>
  salaryLines({ month: M, staffId: T, rules, stats }).reduce((s, l) => s + l.amount, 0);

describe("ruleWindow", () => {
  it("oy ichidagi amal qilish kunlari", () => {
    expect(ruleWindow(rule({ validFrom: "2026-10-16" }), M)).toEqual({
      from: "2026-10-16",
      to: "2026-10-31",
    });
    expect(ruleWindow(rule({ validTo: "2026-10-10" }), M)).toEqual({
      from: "2026-10-01",
      to: "2026-10-10",
    });
  });
  it("oyda amal qilmaydi — null", () => {
    expect(ruleWindow(rule({ validFrom: "2026-11-01" }), M)).toBeNull();
    expect(ruleWindow(rule({ validTo: "2026-09-30" }), M)).toBeNull();
  });
});

describe("qat'iy oylik (J)", () => {
  it("to'liq oy — to'liq summa", () => {
    expect(total([rule({ amount: 3_000_000 })])).toBe(3_000_000);
  });
  it("oy o'rtasida boshlansa — kunlar ulushi", () => {
    // 3 000 000 × 16 / 31 = 1 548 387,09…
    expect(total([rule({ amount: 3_000_000, validFrom: "2026-10-16" })])).toBe(1_548_387);
  });
  it("oy o'rtasida tugasa — kunlar ulushi", () => {
    // 3 100 000 × 10 / 31 = 1 000 000
    expect(total([rule({ amount: 3_100_000, validTo: "2026-10-10" })])).toBe(1_000_000);
  });
  it("oyda amal qilmasa — qator yo'q", () => {
    expect(
      salaryLines({
        month: M,
        staffId: T,
        rules: [rule({ amount: 1, validFrom: "2026-11-01" })],
        stats: [],
      }),
    ).toEqual([]);
  });
});

describe("guruh uchun qat'iy (J)", () => {
  const r = rule({ type: "fixed_per_group", amount: 1_000_000, groupId: "g1" });
  it("oyda belgilangan dars bor — to'liq", () => {
    expect(total([r], [stat("g1", "2026-10-03", 0, 1)])).toBe(1_000_000);
  });
  it("belgilangan dars yo'q — 0", () => {
    expect(total([r], [stat("g1", "2026-10-03", 500_000, 0)])).toBe(0);
  });
  it("dars kelishuv muddatidan tashqarida — 0", () => {
    expect(total([{ ...r, validFrom: "2026-10-10" }], [stat("g1", "2026-10-03", 0, 2)])).toBe(0);
  });
});

describe("tushumdan foiz (H)", () => {
  it("ROADMAP mezoni: 30% × shu oy to'lovlari", () => {
    const stats = [stat("g1", "2026-10-02", 1_200_000), stat("g1", "2026-10-20", 800_000)];
    expect(total([rule({ type: "percent_of_revenue", percent: 30 })], stats)).toBe(600_000);
  });
  it("guruhsiz kelishuv — ustozning hamma guruhlari, boshqa ustoznikisi kirmaydi", () => {
    const stats = [
      stat("g1", "2026-10-02", 1_000_000),
      stat("g2", "2026-10-02", 500_000),
      stat("g3", "2026-10-02", 9_000_000, 0, "other"),
    ];
    const lines = salaryLines({
      month: M,
      staffId: T,
      rules: [rule({ type: "percent_of_revenue", percent: 10 })],
      stats,
    });
    expect(lines.map((l) => [l.groupId, l.base, l.amount])).toEqual([
      ["g1", 1_000_000, 100_000],
      ["g2", 500_000, 50_000],
    ]);
  });
  it("aniq guruhga kelishuv — faqat shu guruh (ustozi boshqa bo'lsa ham)", () => {
    const stats = [
      stat("g1", "2026-10-02", 1_000_000),
      stat("g3", "2026-10-02", 2_000_000, 0, "other"),
    ];
    expect(total([rule({ type: "percent_of_revenue", percent: 20, groupId: "g3" })], stats)).toBe(
      400_000,
    );
  });
  it("kasr foiz va yaxlitlash (butun so'mgacha)", () => {
    // 333 333 × 12,5% = 41 666,625 → 41 667
    expect(
      total(
        [rule({ type: "percent_of_revenue", percent: 12.5 })],
        [stat("g1", "2026-10-02", 333_333)],
      ),
    ).toBe(41_667);
  });
  it("kelishuv boshlanishidan oldingi to'lovlar kirmaydi", () => {
    const stats = [stat("g1", "2026-10-02", 1_000_000), stat("g1", "2026-10-15", 500_000)];
    expect(
      total([rule({ type: "percent_of_revenue", percent: 30, validFrom: "2026-10-10" })], stats),
    ).toBe(150_000);
  });
  it("guruh yo'q — 0 qatori (tushuntirish uchun)", () => {
    const lines = salaryLines({
      month: M,
      staffId: T,
      rules: [rule({ type: "percent_of_revenue", percent: 30 })],
      stats: [],
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.amount).toBe(0);
  });
});

describe("dars uchun (I)", () => {
  it("davomati belgilangan darslar × narx", () => {
    const stats = [
      stat("g1", "2026-10-02", 0, 1),
      stat("g1", "2026-10-04", 0, 2),
      stat("g2", "2026-10-05", 0, 1),
    ];
    expect(total([rule({ type: "per_lesson", amount: 50_000 })], stats)).toBe(200_000);
  });
});

describe("bir nechta kelishuv (K)", () => {
  it("qo'shiladi: qat'iy + foiz", () => {
    const rules = [
      rule({ id: "a", amount: 2_000_000 }),
      rule({ id: "b", type: "percent_of_revenue", percent: 10 }),
    ];
    expect(total(rules, [stat("g1", "2026-10-02", 3_000_000)])).toBe(2_300_000);
  });
});

describe("oy yakuni (K)", () => {
  const lines = salaryLines({
    month: M,
    staffId: T,
    rules: [rule({ amount: 2_000_000 })],
    stats: [],
  });
  it("qoldiq = hisoblangan + bonus − jarima − berilgan", () => {
    expect(
      summarizeSalary(lines, [
        entry("bonus", 300_000),
        entry("penalty", 100_000),
        entry("payout", 1_500_000),
      ]),
    ).toEqual({
      calculated: 2_000_000,
      override: null,
      accrued: 2_000_000,
      bonus: 300_000,
      penalty: 100_000,
      paid: 1_500_000,
      due: 700_000,
    });
  });
  it("oyga xos o'zgartirish hisoblanganning o'rniga (oxirgisi), 0 ham bo'ladi", () => {
    const s = summarizeSalary(lines, [
      entry("override", 1_800_000, { createdAt: "2026-10-05T10:00:00Z" }),
      entry("override", 0, { createdAt: "2026-10-06T10:00:00Z" }),
    ]);
    expect([s.override, s.accrued, s.due]).toEqual([0, 0, 0]);
  });
  it("bekor qilingan yozuvlar hisobga olinmaydi", () => {
    expect(summarizeSalary(lines, [entry("payout", 2_000_000, { voided: true })]).due).toBe(
      2_000_000,
    );
  });
  it("ortiqcha berilgan — manfiy qoldiq", () => {
    expect(summarizeSalary(lines, [entry("payout", 2_500_000)]).due).toBe(-500_000);
  });
  it("computeSalary — qatorlar va yakun birga", () => {
    const r = computeSalary({
      month: M,
      staffId: T,
      rules: [rule({ amount: 1_000_000 })],
      stats: [],
      entries: [],
    });
    expect(r.lines).toHaveLength(1);
    expect(r.due).toBe(1_000_000);
  });
});
