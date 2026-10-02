import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  SYSTEM_ROLE_KEYS,
  SYSTEM_ROLE_PERMISSIONS,
  WILDCARD,
  hasPermission,
  isPermission,
  isSubset,
  normalizePermissions,
} from "./permissions";
import uz from "../../messages/uz.json";
import ru from "../../messages/ru.json";

describe("ALL_PERMISSIONS", () => {
  it("modul.amal ko'rinishida va takrorsiz", () => {
    for (const p of ALL_PERMISSIONS) expect(p).toMatch(/^[a-z]+\.[a-z_]+$/);
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it("har ruxsat va modul uchun uz/ru nomi bor", () => {
    for (const msgs of [uz, ru]) {
      const groups = msgs.permissions as Record<string, Record<string, string>>;
      for (const [module, actions] of Object.entries(PERMISSION_GROUPS)) {
        expect(groups[module]?._title, `${module}._title`).toBeTruthy();
        for (const a of actions) expect(groups[module]?.[a], `${module}.${a}`).toBeTruthy();
      }
    }
  });
});

describe("hasPermission", () => {
  it("aniq ruxsat va *", () => {
    expect(hasPermission(["students.view"], "students.view")).toBe(true);
    expect(hasPermission(["students.view"], "students.create")).toBe(false);
    expect(hasPermission([WILDCARD], "settings.roles")).toBe(true);
    expect(hasPermission([], "dashboard.view")).toBe(false);
  });
});

describe("isSubset", () => {
  it("o'zida yo'q ruxsatni bera olmaydi", () => {
    expect(isSubset(["students.view"], ["students.view", "students.create"])).toBe(true);
    expect(isSubset(["settings.roles"], ["students.view"])).toBe(false);
    expect(isSubset([WILDCARD], ["students.view"])).toBe(false);
    expect(isSubset([WILDCARD], [WILDCARD])).toBe(true);
    expect(isSubset([], [])).toBe(true);
  });
});

describe("normalizePermissions", () => {
  it("noma'lum va takroriy kalitlarni olib tashlaydi", () => {
    expect(normalizePermissions(["students.view", "x.y", "students.view", "*"])).toEqual([
      "students.view",
    ]);
    expect(isPermission("payments.void")).toBe(true);
    expect(isPermission("payments.delete")).toBe(false);
  });
});

describe("SYSTEM_ROLE_PERMISSIONS", () => {
  it("6 ta tizim roli", () => {
    expect(Object.keys(SYSTEM_ROLE_PERMISSIONS).sort()).toEqual([...SYSTEM_ROLE_KEYS].sort());
  });

  it("faqat egasida *", () => {
    expect(SYSTEM_ROLE_PERMISSIONS.owner).toEqual([WILDCARD]);
    for (const key of SYSTEM_ROLE_KEYS.filter((k) => k !== "owner")) {
      const perms = SYSTEM_ROLE_PERMISSIONS[key];
      expect(perms).not.toContain(WILDCARD);
      for (const p of perms) expect(isPermission(p), `${key}: ${p}`).toBe(true);
    }
  });

  it("admin Rollar sahifasiga kira olmaydi (ROADMAP 1-bosqich mezoni)", () => {
    expect(hasPermission(SYSTEM_ROLE_PERMISSIONS.admin, "settings.roles")).toBe(false);
    expect(hasPermission(SYSTEM_ROLE_PERMISSIONS.admin, "settings.staff")).toBe(false);
  });

  it("faqat egasi tarif va rollarni boshqaradi", () => {
    for (const key of SYSTEM_ROLE_KEYS.filter((k) => k !== "owner")) {
      expect(hasPermission(SYSTEM_ROLE_PERMISSIONS[key], "settings.billing"), key).toBe(false);
      expect(hasPermission(SYSTEM_ROLE_PERMISSIONS[key], "settings.roles"), key).toBe(false);
    }
  });

  it("rahbar barcha filiallarni ko'radi va moliya hisobotiga kiradi", () => {
    expect(hasPermission(SYSTEM_ROLE_PERMISSIONS.ceo, "branches.all")).toBe(true);
    expect(hasPermission(SYSTEM_ROLE_PERMISSIONS.ceo, "reports.finance")).toBe(true);
  });

  it("ustoz va sotuvchi to'lovni bekor qila olmaydi", () => {
    for (const key of ["teacher", "sales", "admin"] as const) {
      expect(hasPermission(SYSTEM_ROLE_PERMISSIONS[key], "payments.void"), key).toBe(false);
    }
  });
});
