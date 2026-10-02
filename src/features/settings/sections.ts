import type { Permission } from "@/lib/permissions";

export type SettingsSection =
  "organization" | "branches" | "roles" | "staff" | "courses" | "rooms" | "holidays" | "tags";

/** Sozlamalar bo'limlari va ularga kerakli ruxsat. Qolganlari (sabablar, to'lov turlari, ...) keyingi bosqichlarda. */
export const SETTINGS_SECTIONS: readonly { key: SettingsSection; permission: Permission }[] = [
  { key: "organization", permission: "settings.organization" },
  { key: "branches", permission: "settings.branches" },
  { key: "roles", permission: "settings.roles" },
  { key: "staff", permission: "settings.staff" },
  { key: "courses", permission: "settings.catalogs" },
  { key: "rooms", permission: "settings.catalogs" },
  { key: "holidays", permission: "settings.catalogs" },
  { key: "tags", permission: "settings.catalogs" },
];
