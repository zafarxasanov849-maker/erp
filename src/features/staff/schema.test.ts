import { describe, expect, it } from "vitest";

import { staffCreateSchema, staffUpdateSchema } from "./schema";

const role = "8b6f3c1e-6c1d-4c47-9f61-0b5e3f2a9d10";
const branch = "1f0c6a2b-3d4e-4f50-8a6b-7c8d9e0f1a2b";

describe("staffCreateSchema", () => {
  const base = {
    fullName: "Charos Admin",
    phone: "93 555 66 77",
    tempPassword: "abcd2345",
    roleId: role,
    isTeacher: false,
    allBranches: false,
    branchIds: [branch],
  };

  it("to'g'ri", () => {
    expect(staffCreateSchema.safeParse(base).success).toBe(true);
  });

  it("filial tanlanmasa (va barcha filiallar emas) — xato", () => {
    const r = staffCreateSchema.safeParse({ ...base, branchIds: [] });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]).toMatchObject({
      path: ["branchIds"],
      message: "validation.branchRequired",
    });
    expect(staffCreateSchema.safeParse({ ...base, branchIds: [], allBranches: true }).success).toBe(
      true,
    );
  });

  it("rol majburiy, parol kamida 8 belgi", () => {
    const r = staffCreateSchema.safeParse({ ...base, roleId: "", tempPassword: "abc" });
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["roleId", "tempPassword"]));
  });
});

describe("staffUpdateSchema", () => {
  it("id majburiy", () => {
    const r = staffUpdateSchema.safeParse({
      isActive: true,
      roleId: role,
      isTeacher: true,
      allBranches: true,
      branchIds: [],
    });
    expect(r.success).toBe(false);
  });
});
