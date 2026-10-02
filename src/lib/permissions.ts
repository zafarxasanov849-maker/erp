/**
 * Ruxsatlar: `modul.amal`. Rol = ruxsatlar to'plami (roles.permissions text[]).
 * "*" — barcha ruxsatlar (faqat Egasi roli).
 *
 * Bu fayl yagona manba: UI (rol tahrirlash), server (requirePermission) va
 * markaz ochilganda yaratiladigan tizim rollari shu yerdan olinadi.
 * RLS'dagi has_permission() ham shu kalitlarni tekshiradi — kalitni o'zgartirsangiz,
 * supabase/migrations dagi siyosatlarni ham yangilang.
 * Nomlar messages/*.json → permissions.<modul>.<amal>.
 */

export const PERMISSION_GROUPS = {
  dashboard: ["view"],
  students: ["view", "create", "update", "delete", "export"],
  groups: ["view", "create", "update", "delete"],
  attendance: ["view", "manage"],
  payments: ["view", "create", "void", "refund"],
  discounts: ["manage"],
  expenses: ["view", "create", "update", "delete"],
  cash: ["view", "handover"],
  salary: ["view", "manage"],
  leads: ["view", "view_all", "create", "update", "delete", "settings"],
  reports: ["view", "finance"],
  sms: ["view", "send"],
  branches: ["all"],
  settings: ["organization", "branches", "roles", "staff", "catalogs", "integrations", "billing"],
  audit: ["view"],
} as const;

type Groups = typeof PERMISSION_GROUPS;
export type PermissionModule = keyof Groups;
export type Permission = {
  [M in PermissionModule]: `${M}.${Groups[M][number]}`;
}[PermissionModule];

export const ALL_PERMISSIONS: readonly Permission[] = (
  Object.entries(PERMISSION_GROUPS) as [PermissionModule, readonly string[]][]
).flatMap(([m, actions]) => actions.map((a) => `${m}.${a}` as Permission));

export const WILDCARD = "*";

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/** Rol ruxsatlarida `perm` bormi ("*" hammasini beradi). */
export function hasPermission(granted: readonly string[], perm: Permission): boolean {
  return granted.includes(WILDCARD) || granted.includes(perm);
}

/** `requested` ning hammasi `granted` da bormi — o'zida yo'q ruxsatni boshqaga berib bo'lmaydi. */
export function isSubset(requested: readonly string[], granted: readonly string[]): boolean {
  if (granted.includes(WILDCARD)) return true;
  if (requested.includes(WILDCARD)) return false;
  return requested.every((p) => granted.includes(p));
}

/** Noma'lum kalitlarni olib tashlaydi, takrorlarni yo'qotadi, tartiblaydi. */
export function normalizePermissions(values: readonly string[]): Permission[] {
  return [...new Set(values.filter(isPermission))].sort();
}

// ---------- Tizim rollari (shablonlar) ----------

export type SystemRoleKey = "owner" | "ceo" | "manager" | "admin" | "sales" | "teacher";

export const SYSTEM_ROLE_KEYS: readonly SystemRoleKey[] = [
  "owner",
  "ceo",
  "manager",
  "admin",
  "sales",
  "teacher",
];

const allOf = (m: PermissionModule) =>
  ALL_PERMISSIONS.filter((p) => p.startsWith(`${m}.`)) as Permission[];

const CEO: Permission[] = ALL_PERMISSIONS.filter(
  (p) => p !== "settings.billing" && p !== "settings.roles",
) as Permission[];

const MANAGER: Permission[] = [
  "dashboard.view",
  ...allOf("students"),
  ...allOf("groups"),
  ...allOf("attendance"),
  "payments.view",
  "payments.create",
  "payments.void",
  "payments.refund",
  "discounts.manage",
  ...allOf("expenses"),
  ...allOf("cash"),
  "salary.view",
  ...allOf("leads"),
  ...allOf("reports"),
  ...allOf("sms"),
  "settings.staff",
  "settings.catalogs",
];

const ADMIN: Permission[] = [
  "dashboard.view",
  "students.view",
  "students.create",
  "students.update",
  "students.export",
  "groups.view",
  "attendance.view",
  "attendance.manage",
  "payments.view",
  "payments.create",
  "expenses.view",
  "expenses.create",
  "cash.view",
  "cash.handover",
  "leads.view",
  "leads.create",
  "leads.update",
  "sms.view",
  "sms.send",
];

const SALES: Permission[] = [
  "dashboard.view",
  "students.view",
  "students.create",
  "groups.view",
  "leads.view",
  "leads.create",
  "leads.update",
  "sms.send",
];

/** Ustoz: o'z guruhlari va davomati RLS'da teacher_id orqali beriladi, bu yerda faqat umumiylari. */
const TEACHER: Permission[] = ["dashboard.view", "groups.view", "attendance.view"];

export const SYSTEM_ROLE_PERMISSIONS: Readonly<Record<SystemRoleKey, readonly string[]>> = {
  owner: [WILDCARD],
  ceo: normalizePermissions(CEO),
  manager: normalizePermissions(MANAGER),
  admin: normalizePermissions(ADMIN),
  sales: normalizePermissions(SALES),
  teacher: normalizePermissions(TEACHER),
};
