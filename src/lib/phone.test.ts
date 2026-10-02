import { describe, expect, it } from "vitest";

import {
  KNOWN_OPERATOR_CODES,
  formatLocalPhoneInput,
  formatPhone,
  isValidPhone,
  normalizePhone,
  toLocalPhoneInput,
} from "./phone";

describe("normalizePhone", () => {
  it.each([
    "+998901234567",
    "+998 90 123 45 67",
    "+998 (90) 123-45-67",
    "998901234567",
    "901234567",
    "90 123 45 67",
    "(90) 123-45-67",
    "90.123.45.67",
    "8 90 123 45 67",
  ])("%s → +998901234567", (input) => {
    expect(normalizePhone(input)).toEqual({
      ok: true,
      phone: "+998901234567",
      code: "90",
      operator: "Beeline",
    });
  });

  it("ma'lum operator kodlari nomi bilan", () => {
    for (const [code, operator] of Object.entries(KNOWN_OPERATOR_CODES)) {
      const r = normalizePhone(`${code}1234567`);
      expect(r, code).toEqual({ ok: true, phone: `+998${code}1234567`, code, operator });
    }
  });

  it("ro'yxatda yo'q kod ham qabul qilinadi (yangi operator)", () => {
    expect(normalizePhone("+998 87 123 45 67")).toEqual({
      ok: true,
      phone: "+998871234567",
      code: "87",
      operator: null,
    });
    expect(normalizePhone("12 345 67 89")).toMatchObject({ ok: true, phone: "+998123456789" });
  });

  it("shahar raqami ham qabul qilinadi", () => {
    expect(normalizePhone("71 234 56 78")).toEqual({
      ok: true,
      phone: "+998712345678",
      code: "71",
      operator: null,
    });
  });

  it("bo'sh kirish", () => {
    expect(normalizePhone("")).toEqual({ ok: false, error: "empty" });
    expect(normalizePhone("   ")).toEqual({ ok: false, error: "empty" });
  });

  it("noto'g'ri uzunlik yoki belgilar", () => {
    expect(normalizePhone("90123456")).toEqual({ ok: false, error: "invalid_format" });
    expect(normalizePhone("9012345678")).toEqual({ ok: false, error: "invalid_format" });
    expect(normalizePhone("+7 901 234 56 78")).toEqual({ ok: false, error: "invalid_format" });
    expect(normalizePhone("+901234567")).toEqual({ ok: false, error: "invalid_format" });
    expect(normalizePhone("90 123 45 6a")).toEqual({ ok: false, error: "invalid_format" });
  });
});

describe("isValidPhone", () => {
  it("natija bazadagi CHECK (^\\+998[0-9]{9}$) bilan mos", () => {
    for (const input of ["93 555 66 77", "87 000 00 00", "+998 71 200 00 00"]) {
      const r = normalizePhone(input);
      expect(r.ok && /^\+998[0-9]{9}$/.test(r.phone), input).toBe(true);
    }
    expect(isValidPhone("93 555 66 77")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });
});

describe("formatPhone", () => {
  it("+998 90 123 45 67", () => {
    expect(formatPhone("+998901234567")).toBe("+998 90 123 45 67");
  });

  it("noma'lum formatni o'zgartirmaydi", () => {
    expect(formatPhone("12345")).toBe("12345");
  });
});

describe("formatLocalPhoneInput", () => {
  it.each([
    ["9", "9"],
    ["90", "90"],
    ["901", "90 1"],
    ["90123", "90 123"],
    ["901234", "90 123 4"],
    ["9012345", "90 123 45"],
    ["901234567", "90 123 45 67"],
    ["9012345678", "90 123 45 67"],
    ["+998 90 123 45 67", "90 123 45 67"],
    ["998901234567", "90 123 45 67"],
    ["(90) 123-45-67", "90 123 45 67"],
    ["", ""],
  ])("%s → %s", (input, expected) => {
    expect(formatLocalPhoneInput(input)).toBe(expected);
  });

  it("natija normalizePhone bilan mos", () => {
    expect(normalizePhone(formatLocalPhoneInput("+998901234567"))).toMatchObject({
      ok: true,
      phone: "+998901234567",
    });
  });
});

describe("toLocalPhoneInput", () => {
  it("bazadagi raqamni formaga", () => {
    expect(toLocalPhoneInput("+998901234567")).toBe("90 123 45 67");
    expect(toLocalPhoneInput(null)).toBe("");
  });
});
