import { describe, expect, it } from "vitest";

import { MOBILE_OPERATOR_CODES, formatPhone, isValidPhone, normalizePhone } from "./phone";

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
    const r = normalizePhone(input);
    expect(r).toEqual({
      ok: true,
      phone: "+998901234567",
      code: "90",
      operator: "Beeline",
      isMobile: true,
    });
  });

  it("barcha mobil operator kodlari qabul qilinadi", () => {
    for (const code of Object.keys(MOBILE_OPERATOR_CODES)) {
      const r = normalizePhone(`${code}1234567`);
      expect(r.ok, code).toBe(true);
    }
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

  it("noma'lum operator kodi", () => {
    expect(normalizePhone("+998121234567")).toEqual({ ok: false, error: "unknown_operator" });
    expect(normalizePhone("001234567")).toEqual({ ok: false, error: "unknown_operator" });
  });

  it("shahar raqami faqat allowLandline bilan", () => {
    expect(normalizePhone("71 234 56 78")).toEqual({ ok: false, error: "unknown_operator" });
    expect(normalizePhone("71 234 56 78", { allowLandline: true })).toEqual({
      ok: true,
      phone: "+998712345678",
      code: "71",
      operator: null,
      isMobile: false,
    });
  });
});

describe("isValidPhone", () => {
  it("bazadagi CHECK bilan mos natija beradi", () => {
    const r = normalizePhone("93 555 66 77");
    expect(r.ok && /^\+998[0-9]{9}$/.test(r.phone)).toBe(true);
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
