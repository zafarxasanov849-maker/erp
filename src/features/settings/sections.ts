import type { Permission } from "@/lib/permissions";

export type SettingsSection = "organization" | "branches" | "roles" | "staff";

/** Sozlamalar bo'limlari va ularga kerakli ruxsat. Qolganlari (kurslar, xonalar, ...) keyingi bosqichlarda. */
export const SETTINGS_SECTIONS: readonly { key: SettingsSection; permission: Permission }[] = [
  { key: "organization", permission: "settings.organization" },
  { key: "branches", permission: "settings.branches" },
  { key: "roles", permission: "settings.roles" },
  { key: "staff", permission: "settings.staff" },
];
