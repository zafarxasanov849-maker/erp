import { describe, expect, it } from "vitest";

import { MINUS_SIGN, formatMoney, parseMoney, toMoney } from "./money";

describe("formatMoney", () => {
  it("guruhlarni bo'shliq bilan ajratadi va so'm qo'shadi", () => {
    expect(formatMoney(1_250_000)).toBe("1 250 000 so'm");
    expect(formatMoney(680_000)).toBe("680 000 so'm");
    expect(formatMoney(261_538)).toBe("261 538 so'm");
  });

  it("kichik summalar va nol", () => {
    expect(formatMoney(0)).toBe("0 so'm");
    expect(formatMoney(5)).toBe("5 so'm");
    expect(formatMoney(999)).toBe("999 so'm");
    expect(formatMoney(1000)).toBe("1 000 so'm");
  });

  it("manfiy summa (qarz) haqiqiy minus belgisi bilan", () => {
    expect(formatMoney(-5000)).toBe(`${MINUS_SIGN}5 000 so'm`);
    expect(formatMoney(-1_250_000)).toBe("−1 250 000 so'm");
  });

  it("bigint qabul qiladi", () => {
    expect(formatMoney(12_345_678n)).toBe("12 345 678 so'm");
  });

  it("rus tilida сум", () => {
    expect(formatMoney(1_250_000, { locale: "ru" })).toBe("1 250 000 сум");
  });

  it("valyutasiz va ishorali", () => {
    expect(formatMoney(1_250_000, { currency: false })).toBe("1 250 000");
    expect(formatMoney(5000, { signed: true })).toBe("+5 000 so'm");
    expect(formatMoney(-5000, { signed: true })).toBe("−5 000 so'm");
    expect(formatMoney(0, { signed: true })).toBe("0 so'm");
  });

  it("kasr son yoki NaN bo'lsa xato beradi", () => {
    expect(() => formatMoney(10.5)).toThrow(RangeError);
    expect(() => formatMoney(Number.NaN)).toThrow(RangeError);
    expect(() => toMoney(2 ** 60)).toThrow(RangeError);
  });
});

describe("parseMoney", () => {
  it("bo'shliqli va bo'shliqsiz", () => {
    expect(parseMoney("1 250 000")).toBe(1_250_000);
    expect(parseMoney("1250000")).toBe(1_250_000);
    expect(parseMoney(" 680 000 ")).toBe(680_000);
  });

  it("valyuta nomi bilan", () => {
    expect(parseMoney("1 250 000 so'm")).toBe(1_250_000);
    expect(parseMoney("1 250 000 soʻm")).toBe(1_250_000);
    expect(parseMoney("1 250 000 сум")).toBe(1_250_000);
  });

  it("manfiy", () => {
    expect(parseMoney("-5 000")).toBe(-5000);
    expect(parseMoney("−5 000")).toBe(-5000);
  });

  it("formatMoney bilan aylana", () => {
    for (const n of [0, 7, 1000, -261_538, 99_999_999]) {
      expect(parseMoney(formatMoney(n))).toBe(n);
    }
  });

  it("noto'g'ri kirish → null", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("12.5")).toBeNull();
    expect(parseMoney("12,5")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("1e6")).toBeNull();
  });
});
