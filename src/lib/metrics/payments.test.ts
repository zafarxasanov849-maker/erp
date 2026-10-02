import { describe, expect, it } from "vitest";

import { summarizePayments } from "./payments";

describe("summarizePayments", () => {
  it("tur bo'yicha jamlar, bekor qilinganlarsiz; teng summada — alifbo bo'yicha", () => {
    const r = summarizePayments([
      { amount: 300_000, methodName: "Naqd", voided: false },
      { amount: 500_000, methodName: "Karta · Uzcard", voided: false },
      { amount: 200_000, methodName: "Naqd", voided: false },
      { amount: 900_000, methodName: "Naqd", voided: true },
    ]);
    expect(r.total).toBe(1_000_000);
    expect(r.count).toBe(3);
    expect(r.voidedCount).toBe(1);
    expect(r.byMethod).toEqual([
      { method: "Karta · Uzcard", amount: 500_000, count: 1 },
      { method: "Naqd", amount: 500_000, count: 2 },
    ]);
  });
  it("bo'sh ro'yxat", () => {
    expect(summarizePayments([])).toEqual({ total: 0, count: 0, voidedCount: 0, byMethod: [] });
  });
});
