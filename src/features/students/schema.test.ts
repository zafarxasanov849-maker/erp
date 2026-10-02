import { describe, expect, it } from "vitest";

import { freezeSchema, leaveSchema, normalizeTelegram, studentCreateSchema } from "./schema";

const g1 = "8b6f3c1e-6c1d-4c47-9f61-0b5e3f2a9d10";
const g2 = "1f0c6a2b-3d4e-4f50-8a6b-7c8d9e0f1a2b";
const base = {
  branchId: g1,
  joinedAt: "02.10.2026",
  tagIds: [],
  enrollments: [],
  fullName: "Mohira Eshmatova",
  phone: "90 123 45 67",
  gender: "" as const,
  birthDate: "",
  parentName: "",
  parentPhone: "",
  telegram: "",
  address: "",
  school: "",
  passportSeries: "",
};

describe("studentCreateSchema", () => {
  it("faqat ism va telefon majburiy", () => {
    expect(studentCreateSchema.safeParse(base).success).toBe(true);
    const r = studentCreateSchema.safeParse({ ...base, fullName: " ", phone: "" });
    expect(r.error!.issues.map((i) => i.path.join("."))).toEqual(
      expect.arrayContaining(["fullName", "phone"]),
    );
  });

  it("ixtiyoriy telefon va sana tekshiriladi", () => {
    const r = studentCreateSchema.safeParse({
      ...base,
      parentPhone: "123",
      birthDate: "31.02.2010",
    });
    expect(Object.fromEntries(r.error!.issues.map((i) => [i.path.join("."), i.message]))).toEqual({
      parentPhone: "validation.phone",
      birthDate: "validation.date",
    });
  });

  it("bir guruh ikki marta tanlanmaydi", () => {
    const e = { groupId: g2, status: "trial" as const, date: "02.10.2026" };
    const r = studentCreateSchema.safeParse({
      ...base,
      enrollments: [e, { ...e, status: "active" }],
    });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.message).toBe("validation.duplicateGroup");
    expect(studentCreateSchema.safeParse({ ...base, enrollments: [e] }).success).toBe(true);
  });
});

describe("leaveSchema / freezeSchema", () => {
  it("chiqarishda sabab majburiy", () => {
    const r = leaveSchema.safeParse({ enrollmentId: g1, date: "02.10.2026", reasonId: "" });
    expect(r.error!.issues[0]).toMatchObject({
      path: ["reasonId"],
      message: "validation.reasonRequired",
    });
  });

  it("muzlatish oralig'i", () => {
    const ok = { enrollmentId: g1, from: "10.10.2026", to: "20.10.2026", reasonId: "" };
    expect(freezeSchema.safeParse(ok).success).toBe(true);
    const r = freezeSchema.safeParse({ ...ok, to: "09.10.2026" });
    expect(r.error!.issues[0]).toMatchObject({ path: ["to"], message: "validation.dateRange" });
  });
});

describe("normalizeTelegram", () => {
  it.each([
    ["@mohira", "mohira"],
    ["mohira", "mohira"],
    ["https://t.me/mohira", "mohira"],
    ["  ", null],
  ])("%s → %s", (input, expected) => {
    expect(normalizeTelegram(input)).toBe(expected);
  });
});
