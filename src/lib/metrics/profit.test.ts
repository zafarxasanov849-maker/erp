import { describe, expect, it } from "vitest";

import { profitOf } from "./profit";

describe("profitOf", () => {
  it("egasiga olingan pul sof foydaga kirmaydi, ortgan puldan ayriladi", () => {
    expect(
      profitOf(10_000_000, [
        { kind: "rent", amount: 2_000_000 },
        { kind: "salary", amount: 3_000_000 },
        { kind: "tax", amount: 500_000 },
        { kind: "owner_draw", amount: 1_500_000 },
      ]),
    ).toEqual({
      revenue: 10_000_000,
      costs: 5_500_000,
      ownerDraw: 1_500_000,
      netProfit: 4_500_000,
      leftover: 3_000_000,
    });
  });
  it("zarar — manfiy sof foyda", () => {
    expect(profitOf(1_000, [{ kind: "operating", amount: 3_000 }]).netProfit).toBe(-2_000);
  });
});
