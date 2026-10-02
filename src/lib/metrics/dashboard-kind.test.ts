import { describe, expect, it } from "vitest";

import { SYSTEM_ROLE_PERMISSIONS } from "@/lib/permissions";

import { dashboardKind } from "./dashboard-kind";

describe("dashboardKind — tizim rollari", () => {
  it.each([
    ["owner", "leader"],
    ["ceo", "leader"],
    ["manager", "leader"],
    ["admin", "admin"],
    ["teacher", "teacher"],
    ["sales", "sales"],
  ] as const)("%s → %s", (key, kind) => {
    expect(
      dashboardKind({ roleKey: key, permissions: SYSTEM_ROLE_PERMISSIONS[key], isTeacher: false }),
    ).toBe(kind);
  });

  it("tizim roli ruxsatlari o'zgartirilgan bo'lsa ham turi o'zgarmaydi", () => {
    expect(
      dashboardKind({ roleKey: "admin", permissions: ["reports.finance"], isTeacher: false }),
    ).toBe("admin");
  });
});

describe("dashboardKind — o'zi yaratilgan rollar", () => {
  const custom = (permissions: string[], isTeacher = false) =>
    dashboardKind({ roleKey: null, permissions, isTeacher });

  it("moliya hisobotlari → rahbar", () => {
    expect(custom(["reports.finance", "payments.create"])).toBe("leader");
    expect(custom(["*"])).toBe("leader");
  });
  it("to'lov qabul qilish yoki davomat boshqaruvi → admin", () => {
    expect(custom(["payments.create"])).toBe("admin");
    expect(custom(["attendance.manage"], true)).toBe("admin");
  });
  it("ustoz → ustoz", () => {
    expect(custom(["groups.view", "leads.view"], true)).toBe("teacher");
  });
  it("lidlar → sotuvchi", () => {
    expect(custom(["leads.view"])).toBe("sales");
  });
  it("hech biri yo'q → oddiy", () => {
    expect(custom(["dashboard.view", "students.view"])).toBe("basic");
  });
});
