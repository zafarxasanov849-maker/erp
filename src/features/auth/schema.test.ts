import { describe, expect, it } from "vitest";

import { newPasswordSchema, registerSchema, verifySchema } from "./schema";

describe("registerSchema", () => {
  const valid = {
    orgName: " Ilm markazi ",
    fullName: "Aziz Karimov",
    phone: "90 123 45 67",
    password: "parol1234",
  };

  it("to'g'ri ma'lumot, bo'shliqlar olib tashlanadi", () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.orgName).toBe("Ilm markazi");
  });

  it("xato kalitlari tarjima kalitlari", () => {
    const r = registerSchema.safeParse({
      ...valid,
      orgName: "  ",
      phone: "123",
      password: "qisqa",
    });
    expect(r.success).toBe(false);
    const byPath = Object.fromEntries(r.error!.issues.map((i) => [i.path.join("."), i.message]));
    expect(byPath).toEqual({
      orgName: "validation.required",
      phone: "validation.phone",
      password: "validation.passwordMin",
    });
  });
});

describe("verifySchema", () => {
  it("6 xonali kod", () => {
    const base = { phone: "90 123 45 67", purpose: "signup" as const };
    expect(verifySchema.safeParse({ ...base, code: "123456" }).success).toBe(true);
    expect(verifySchema.safeParse({ ...base, code: "12345" }).success).toBe(false);
    expect(verifySchema.safeParse({ ...base, code: "12345a" }).success).toBe(false);
    expect(verifySchema.safeParse({ ...base, purpose: "other", code: "123456" }).success).toBe(
      false,
    );
  });
});

describe("newPasswordSchema", () => {
  it("parollar mos kelishi kerak", () => {
    const r = newPasswordSchema.safeParse({ password: "parol1234", confirm: "parol12345" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]).toMatchObject({
      path: ["confirm"],
      message: "validation.passwordMismatch",
    });
    expect(
      newPasswordSchema.safeParse({ password: "parol1234", confirm: "parol1234" }).success,
    ).toBe(true);
  });
});
