import { describe, expect, it } from "vitest";

import {
  type LedgerTransaction,
  allocatePayment,
  balance,
  debtSince,
  enrollmentDebts,
  oldDebt,
} from "./balance";

let seq = 0;
function tx(
  kind: LedgerTransaction["kind"],
  amount: number,
  occurredOn: string,
  extra: Partial<LedgerTransaction> = {},
): LedgerTransaction {
  seq++;
  return {
    kind,
    amount,
    occurredOn,
    createdAt: `${occurredOn}T00:00:${String(seq).padStart(2, "0")}Z`,
    billingMonth: kind === "charge" || kind === "adjustment" ? occurredOn.slice(0, 7) : null,
    enrollmentId: "e1",
    ...extra,
  };
}

describe("§5.11 allocatePayment", () => {
  const debts = [
    { enrollmentId: "B", balance: -500_000, since: "2026-10-01" },
    { enrollmentId: "A", balance: -300_000, since: "2026-09-01" },
    { enrollmentId: "C", balance: 100_000, since: null },
  ];

  it("25. guruh ko'rsatilsa — o'sha a'zolikka to'liq", () => {
    expect(allocatePayment(600_000, debts, "C")).toEqual([{ enrollmentId: "C", amount: 600_000 }]);
  });

  it("26. ko'rsatilmasa — eng eski qarzdan (FIFO), ortiqchasi umumiy balansda", () => {
    expect(allocatePayment(600_000, debts)).toEqual([
      { enrollmentId: "A", amount: 300_000 },
      { enrollmentId: "B", amount: 300_000 },
    ]);
    expect(allocatePayment(1_000_000, debts)).toEqual([
      { enrollmentId: "A", amount: 300_000 },
      { enrollmentId: "B", amount: 500_000 },
      { enrollmentId: null, amount: 200_000 },
    ]);
  });

  it("27. qarz yo'q — hammasi umumiy balansda; summa musbat bo'lishi shart", () => {
    expect(allocatePayment(50_000, [])).toEqual([{ enrollmentId: null, amount: 50_000 }]);
    expect(() => allocatePayment(0, [])).toThrow();
  });
});

describe("§5.10 balans va eski qarz", () => {
  it("28. balans = Σ; bekor qilingan to'lov va teskari yozuv bir-birini yopadi", () => {
    const txs = [
      tx("charge", -680_000, "2026-10-01"),
      tx("payment", 500_000, "2026-10-05"),
      tx("void", -500_000, "2026-10-06"),
    ];
    expect(balance(txs)).toBe(-680_000);
  });

  it("29. eski qarz = min(0, balans + joriy oy yechishlari)", () => {
    const base = [tx("charge", -680_000, "2026-09-01"), tx("charge", -680_000, "2026-10-01")];
    expect(oldDebt([...base, tx("payment", 400_000, "2026-10-03")], "2026-10")).toBe(-280_000);
    expect(oldDebt([...base, tx("payment", 1_000_000, "2026-10-03")], "2026-10")).toBe(0);
    // Joriy oy tuzatishlari ham joriy oy hisobiga kiradi
    expect(
      oldDebt(
        [...base, tx("adjustment", 156_923, "2026-10-12"), tx("payment", 400_000, "2026-10-03")],
        "2026-10",
      ),
    ).toBe(-280_000);
  });

  it("30. qarz qaysi kundan beri — oxirgi marta manfiyga o'tgan kun", () => {
    const txs = [
      tx("charge", -680_000, "2026-09-01"),
      tx("payment", 680_000, "2026-09-10"),
      tx("charge", -680_000, "2026-10-01"),
      tx("payment", 300_000, "2026-10-05"),
    ];
    expect(debtSince(txs)).toBe("2026-10-01");
    expect(debtSince([...txs, tx("payment", 380_000, "2026-10-06")])).toBeNull();
    expect(debtSince([])).toBeNull();
  });
});

describe("31. 3 oylik stsenariy — balans", () => {
  it("to'lovlar, bekor qilish va yechishlar → yakuniy balans va eski qarz", () => {
    const txs = [
      tx("charge", -261_538, "2026-09-21"),
      tx("payment", 300_000, "2026-09-22"),
      tx("charge", -680_000, "2026-10-01"),
      tx("payment", 700_000, "2026-10-10"),
      tx("void", -700_000, "2026-10-10"),
      tx("payment", 650_000, "2026-10-11"),
      tx("adjustment", 156_923, "2026-10-12"),
      tx("adjustment", 52_308, "2026-10-20"),
      tx("charge", -612_000, "2026-11-01"),
      tx("adjustment", 235_385, "2026-11-18"),
    ];
    expect(balance(txs)).toBe(-158_922);
    expect(oldDebt(txs, "2026-11")).toBe(0);
    expect(debtSince(txs)).toBe("2026-11-01");
    expect(enrollmentDebts(txs)).toEqual([
      { enrollmentId: "e1", balance: -158_922, since: "2026-11-01" },
    ]);
  });
});
