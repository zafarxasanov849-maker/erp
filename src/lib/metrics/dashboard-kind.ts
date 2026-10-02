/**
 * Bosh sahifa turi rolga qarab (tasdiqlangan A-qoida).
 * Tizim rollari: Egasi/Rahbar/Menejer → rahbar, Admin → admin, Ustoz → ustoz, Sotuvchi → sotuvchi.
 * O'zi yaratilgan rollar ruxsatlarga qarab: moliya hisobotlari → rahbar; to'lov qabul qilish yoki
 * davomat boshqaruvi → admin; ustoz → ustoz; lidlar → sotuvchi. Hech biri bo'lmasa — oddiy salomlashish.
 */
import { WILDCARD, hasPermission } from "@/lib/permissions";

export type DashboardKind = "leader" | "admin" | "teacher" | "sales" | "basic";

export interface DashboardRole {
  roleKey: string | null;
  permissions: readonly string[];
  isTeacher: boolean;
}

const BY_SYSTEM_ROLE: Record<string, DashboardKind> = {
  owner: "leader",
  ceo: "leader",
  manager: "leader",
  admin: "admin",
  teacher: "teacher",
  sales: "sales",
};

export function dashboardKind(role: DashboardRole): DashboardKind {
  const bySystem = role.roleKey ? BY_SYSTEM_ROLE[role.roleKey] : undefined;
  if (bySystem) return bySystem;
  const p = role.permissions;
  if (p.includes(WILDCARD) || hasPermission(p, "reports.finance")) return "leader";
  if (hasPermission(p, "payments.create") || hasPermission(p, "attendance.manage")) return "admin";
  if (role.isTeacher) return "teacher";
  if (hasPermission(p, "leads.view")) return "sales";
  return "basic";
}
