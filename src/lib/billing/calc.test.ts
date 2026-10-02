import { describe, expect, it } from "vitest";

import {
  type BillingEnrollment,
  type BillingGroup,
  type BillingSettings,
  type LedgerEntry,
  type MonthCalendar,
  type PlannedTransaction,
  chargeForPeriod,
  lessonsInFullMonth,
  lessonsInPeriod,
  monthsToReconcile,
  planMonth,
  roundDiv,
} from "./calc";

// Du-Ch-Ju guruh, 680 000 so'm. Oktyabr 2026 (1-oktabr — payshanba):
// Du: 5,12,19,26 · Ch: 7,14,21,28 · Ju: 2,9,16,23,30 → 13 dars.
const GROUP: BillingGroup = {
  weekdays: [1, 3, 5],
  startDate: "2026-01-01",
  endDate: null,
  price: 680_000,
};
const NO_CAL: MonthCalendar = { holidays: [], cancelled: [] };
const SETTINGS: BillingSettings = { rounding: 1, refundOnLeave: true };
const ACTIVE: BillingEnrollment = {
  activatedAt: "2026-09-01",
  leftAt: null,
  freezes: [],
  discounts: [],
};

function plan(
  overrides: {
    month?: string;
    group?: Partial<BillingGroup>;
    enrollment?: Partial<BillingEnrollment>;
    calendar?: Partial<MonthCalendar>;
    ledger?: LedgerEntry[];
    settings?: Partial<BillingSettings>;
  } = {},
): PlannedTransaction | null {
  return planMonth({
    month: overrides.month ?? "2026-10",
    group: { ...GROUP, ...overrides.group },
    enrollment: { ...ACTIVE, ...overrides.enrollment },
    calendar: { ...NO_CAL, ...overrides.calendar },
    ledger: overrides.ledger ?? [],
    settings: { ...SETTINGS, ...overrides.settings },
  });
}

/** Rejani daftar yozuviga aylantirish (bazaga yozilgandek) */
const toLedger = (t: PlannedTransaction): LedgerEntry => ({
  month: t.month,
  basis: t.basis,
  lessons: t.lessons,
});

/** Oktyabr uchun to'liq oylik yechilgan daftar */
const octCharged = () => [toLedger(plan()!)];

describe("§5.1 lessonsInPeriod", () => {
  it("1. Du-Ch-Ju guruh, oktyabr 2026 → 13 dars", () => {
    expect(lessonsInPeriod(GROUP, "2026-10-01", "2026-10-31")).toHaveLength(13);
    expect(lessonsInFullMonth(GROUP.weekdays, "2026-10", NO_CAL)).toBe(13);
  });

  it("2. bayram va bekor qilingan sanalar ayiriladi, bir sana ikki marta ayirilmaydi", () => {
    const dates = lessonsInPeriod(
      GROUP,
      "2026-10-01",
      "2026-10-31",
      ["2026-10-05"],
      ["2026-10-05", "2026-10-07"],
    );
    expect(dates).toHaveLength(11);
    expect(dates).not.toContain("2026-10-05");
  });

  it("3. fevral: 2027 (28 kun) va 2028 (kabisa)", () => {
    expect(lessonsInFullMonth([1, 3, 5], "2027-02", NO_CAL)).toBe(12);
    expect(lessonsInFullMonth([2], "2027-02", NO_CAL)).toBe(4);
    expect(lessonsInFullMonth([2], "2028-02", NO_CAL)).toBe(5); // 29-fevral seshanba
  });

  it("4. guruh oy o'rtasida ochilsa: oydagi darslar — butun oy bo'yicha (A-qoida)", () => {
    const g = { startDate: "2026-10-15" };
    expect(lessonsInPeriod({ ...GROUP, ...g }, "2026-10-01", "2026-10-31")).toHaveLength(7);
    // 680 000 × 7/13 = 366 153.8
    expect(plan({ group: g })?.amount).toBe(-366_154);
  });
});

describe("§5.2 chargeForPeriod, §5.9 yaxlitlash, §5.8 chegirma", () => {
  it("5. to'liq oy = narx", () => {
    expect(chargeForPeriod({ price: 680_000, lessonsInPeriod: 13, lessonsInFullMonth: 13 })).toBe(
      680_000,
    );
  });

  it("6. PRD misoli: 680 000 × 5/13 = 261 538", () => {
    expect(chargeForPeriod({ price: 680_000, lessonsInPeriod: 5, lessonsInFullMonth: 13 })).toBe(
      261_538,
    );
  });

  it("7. yaxlitlash 100 va 1 000 so'mgacha, yarimi yuqoriga", () => {
    const base = { price: 680_000, lessonsInPeriod: 5, lessonsInFullMonth: 13 };
    expect(chargeForPeriod({ ...base, rounding: 100 })).toBe(261_500);
    expect(chargeForPeriod({ ...base, rounding: 1000 })).toBe(262_000);
    expect(roundDiv(5, 2)).toBe(3);
    expect(roundDiv(-5, 2)).toBe(-3);
    expect(roundDiv(250, 1, 100)).toBe(300);
  });

  it("8. foiz va qat'iy chegirma", () => {
    const base = { price: 680_000, lessonsInPeriod: 13, lessonsInFullMonth: 13 };
    const d = { from: "2026-01-01", to: null };
    expect(chargeForPeriod({ ...base, discount: { ...d, percent: 10, amount: null } })).toBe(
      612_000,
    );
    expect(chargeForPeriod({ ...base, discount: { ...d, percent: null, amount: 100_000 } })).toBe(
      580_000,
    );
    expect(chargeForPeriod({ ...base, discount: { ...d, percent: 12.5, amount: null } })).toBe(
      595_000,
    );
  });

  it("9. chegirma narxdan katta → 0; darslar 0 → 0", () => {
    const d = { from: "2026-01-01", to: null, percent: null, amount: 900_000 };
    expect(
      chargeForPeriod({ price: 680_000, discount: d, lessonsInPeriod: 13, lessonsInFullMonth: 13 }),
    ).toBe(0);
    expect(chargeForPeriod({ price: 680_000, lessonsInPeriod: 0, lessonsInFullMonth: 13 })).toBe(0);
  });
});

describe("§5.2 oylik yechish", () => {
  it("10. faol a'zolik, oy boshida → to'liq narx", () => {
    const t = plan()!;
    expect(t).toMatchObject({
      kind: "charge",
      amount: -680_000,
      lessonsCount: 13,
      month: "2026-10",
    });
    expect(t.basis).toEqual({ base: 680_000, full: 13 });
    expect([t.periodStart, t.periodEnd]).toEqual(["2026-10-02", "2026-10-30"]);
  });

  it("11. sinovdagi va oydan oldin chiqqan a'zolik yechilmaydi (§5.4)", () => {
    expect(plan({ enrollment: { activatedAt: null } })).toBeNull();
    expect(plan({ enrollment: { leftAt: "2026-09-20" } })).toBeNull();
  });

  it("12. oldindan ma'lum muzlatish kunlari yechilmaydi (B-qoida)", () => {
    // 12, 14, 16-oktabr muzlatilgan → 10 dars: 680 000 × 10/13 = 523 076.9
    const t = plan({ enrollment: { freezes: [["2026-10-12", "2026-10-18"]] } })!;
    expect(t.amount).toBe(-523_077);
    expect(t.lessonsCount).toBe(10);
  });

  it("13. chegirma oy o'rtasida boshlansa — faqat keyingi darslar arzon (C-qoida)", () => {
    // 19-oktabrdan 10%: 7 dars × 680 000 + 6 dars × 612 000 = 8 432 000 / 13 = 648 615.4
    const t = plan({
      enrollment: { discounts: [{ percent: 10, amount: null, from: "2026-10-19", to: null }] },
    })!;
    expect(t.amount).toBe(-648_615);
    expect(t.discounted).toBe(true);
  });
});

describe("§5.3 faollashtirish", () => {
  it("14. 1-kuni — to'liq; oxirgi dars kuni — 1 dars; oxirgi darsdan keyin — 0", () => {
    expect(plan({ enrollment: { activatedAt: "2026-10-01" } })?.amount).toBe(-680_000);
    expect(plan({ enrollment: { activatedAt: "2026-10-30" } })?.amount).toBe(-52_308);
    expect(plan({ enrollment: { activatedAt: "2026-10-31" } })).toBeNull();
    // PRD misoli: 20-oktabrda 5 dars qolgan
    expect(plan({ enrollment: { activatedAt: "2026-10-20" } })?.amount).toBe(-261_538);
  });

  it("15. o'tgan sana bilan faollashsa — o'tgan oy qoldig'i va joriy oy; ikki marta yechilmaydi", () => {
    const enrollment = { activatedAt: "2026-09-20" };
    expect(monthsToReconcile({ activatedAt: "2026-09-20", leftAt: null }, [], "2026-10")).toEqual([
      "2026-09",
      "2026-10",
    ]);
    // Sentyabr 2026: 21, 23, 25, 28, 30 → 5/13
    const sep = plan({ month: "2026-09", enrollment })!;
    expect(sep.amount).toBe(-261_538);
    expect(plan({ enrollment })?.amount).toBe(-680_000);
    expect(plan({ month: "2026-09", enrollment, ledger: [toLedger(sep)] })).toBeNull();
    // Kelajak oy hech qachon yechilmaydi; chiqqan oydan keyingilari ham
    expect(
      monthsToReconcile({ activatedAt: "2026-09-20", leftAt: "2026-09-25" }, [], "2026-11"),
    ).toEqual(["2026-09"]);
  });
});

describe("§5.5 muzlatish", () => {
  it("16. yechilgan oyda muzlatish → darslar ulushi qaytariladi", () => {
    // 12, 14, 16 → 680 000 × 3/13 = 156 923.1
    const t = plan({
      enrollment: { freezes: [["2026-10-12", "2026-10-18"]] },
      ledger: octCharged(),
    })!;
    expect(t).toMatchObject({ kind: "adjustment", amount: 156_923, lessonsCount: -3 });
  });

  it("17. ikki oyga cho'zilgan muzlatish — har oy alohida, faqat yechilgan oylar", () => {
    const freezes = [["2026-10-26", "2026-11-06"]] as const;
    expect(plan({ enrollment: { freezes }, ledger: octCharged() })?.amount).toBe(156_923);
    // Noyabr 2026 (13 dars): 2, 4, 6 muzlatilgan → 1-noyabrdagi yechish 10 dars
    expect(plan({ month: "2026-11", enrollment: { freezes } })?.amount).toBe(-523_077);
  });

  it("18. bayram muzlatish ichida — ikki marta qaytarilmaydi", () => {
    const enrollment = { freezes: [["2026-10-12", "2026-10-18"]] as const };
    const ledger = [...octCharged()];
    ledger.push(toLedger(plan({ enrollment, ledger })!));
    expect(plan({ enrollment, ledger, calendar: { holidays: ["2026-10-14"] } })).toBeNull();
  });

  it("19. muzlatish qisqartirilsa — qaytarilgan ortiqcha qayta yechiladi (D-qoida)", () => {
    const ledger = [...octCharged()];
    ledger.push(
      toLedger(plan({ enrollment: { freezes: [["2026-10-12", "2026-10-18"]] }, ledger })!),
    );
    const t = plan({ enrollment: { freezes: [["2026-10-12", "2026-10-13"]] }, ledger })!;
    // 14 va 16 qaytdi: 680 000 × 2/13 = 104 615.4
    expect(t).toMatchObject({ kind: "adjustment", amount: -104_615, lessonsCount: 2 });
    // Muzlatish butunlay bekor qilinsa — uchala dars
    expect(plan({ enrollment: { freezes: [] }, ledger })?.amount).toBe(-156_923);
  });
});

describe("§5.6 chiqarish", () => {
  it("20. chiqqan kundan keyingi darslar qaytariladi, chiqish kunidagi dars qaytarilmaydi", () => {
    // 21-oktabr chiqdi: 23, 26, 28, 30 → 680 000 × 4/13 = 209 230.8
    const t = plan({ enrollment: { leftAt: "2026-10-21" }, ledger: octCharged() })!;
    expect(t.amount).toBe(209_231);
    expect(t.lessons.map((l) => l.d)).toEqual([
      "2026-10-23",
      "2026-10-26",
      "2026-10-28",
      "2026-10-30",
    ]);
  });

  it("21. 'qaytarilmasin' sozlamasida → 0", () => {
    expect(
      plan({
        enrollment: { leftAt: "2026-10-21" },
        ledger: octCharged(),
        settings: { refundOnLeave: false },
      }),
    ).toBeNull();
  });

  it("22. muzlatish bilan qaytarilgan darslar ikki marta qaytarilmaydi", () => {
    const freezes = [["2026-10-26", "2026-10-30"]] as const;
    const ledger = [...octCharged()];
    ledger.push(toLedger(plan({ enrollment: { freezes }, ledger })!));
    // Faqat 23-oktabr qoldi: 680 000 / 13 = 52 307.7
    expect(plan({ enrollment: { freezes, leftAt: "2026-10-21" }, ledger })?.amount).toBe(52_308);
  });
});

describe("§5.7 bayram", () => {
  it("23. yechilgan oyda bayram → har dars uchun narx/oydagi_darslar; faol bo'lmagan kunga — yo'q", () => {
    expect(plan({ ledger: octCharged(), calendar: { holidays: ["2026-10-14"] } })).toMatchObject({
      amount: 52_308,
      lessonsCount: -1,
    });
    // 20-oktabrda faollashgan: 14-oktabrdagi bayram unga tegmaydi, 23-oktabrdagisi tegadi
    const enrollment = { activatedAt: "2026-10-20" };
    const ledger = [toLedger(plan({ enrollment })!)];
    expect(plan({ enrollment, ledger, calendar: { holidays: ["2026-10-14"] } })).toBeNull();
    expect(plan({ enrollment, ledger, calendar: { holidays: ["2026-10-23"] } })?.amount).toBe(
      52_308,
    );
  });

  it("24. bayram o'chirilsa — teskari yozuv; oydagi darslar soni o'zgarmaydi", () => {
    const ledger = [...octCharged()];
    const refund = plan({ ledger, calendar: { holidays: ["2026-10-14"] } })!;
    expect(refund.basis.full).toBe(13);
    ledger.push(toLedger(refund));
    expect(plan({ ledger })?.amount).toBe(-52_308);
  });
});

/**
 * 31. Stsenariy (ROADMAP mezoni): bitta talaba, 3 oy. Excel'dagi qo'lda hisob bilan bir xil bo'lishi kerak.
 * Balans qismi balance.test.ts da.
 */
describe("31. 3 oylik stsenariy — yechishlar", () => {
  it("sentyabr–noyabr: faollashish, oylik, muzlatish, bayram, chegirma, chiqish", () => {
    const ledgers = new Map<string, LedgerEntry[]>();
    const enrollment: BillingEnrollment = {
      activatedAt: "2026-09-21",
      leftAt: null,
      freezes: [],
      discounts: [],
    };
    const calendar: Record<string, MonthCalendar> = {};
    const amounts: number[] = [];
    const run = (month: string) => {
      const ledger = ledgers.get(month) ?? [];
      const t = planMonth({
        month,
        group: GROUP,
        enrollment,
        calendar: calendar[month] ?? NO_CAL,
        ledger,
        settings: SETTINGS,
      });
      if (t) {
        ledgers.set(month, [...ledger, toLedger(t)]);
        amounts.push(t.amount);
      }
      return t?.amount ?? 0;
    };

    expect(run("2026-09")).toBe(-261_538); // 21-sentabr faollashdi: 5/13
    expect(run("2026-10")).toBe(-680_000); // 1-oktabr oylik
    enrollment.freezes = [["2026-10-12", "2026-10-16"]];
    expect(run("2026-10")).toBe(156_923); // 12, 14, 16 muzlatildi
    calendar["2026-10"] = { holidays: ["2026-10-23"], cancelled: [] };
    expect(run("2026-10")).toBe(52_308); // 23-oktabr bayram
    enrollment.discounts = [{ percent: 10, amount: null, from: "2026-11-01", to: null }];
    expect(run("2026-10")).toBe(0); // chegirma noyabrdan — oktyabrga tegmaydi
    expect(run("2026-11")).toBe(-612_000); // 1-noyabr: 10% chegirma bilan
    enrollment.leftAt = "2026-11-18";
    expect(run("2026-11")).toBe(235_385); // 20, 23, 25, 27, 30 → 612 000 × 5/13
    expect(run("2026-11")).toBe(0); // takror ishlasa — hech narsa

    expect(amounts.reduce((s, a) => s + a, 0)).toBe(-1_108_922);
  });
});
