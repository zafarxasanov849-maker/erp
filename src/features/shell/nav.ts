import {
  Banknote,
  CalendarCheck,
  ChartColumn,
  GraduationCap,
  LayoutDashboard,
  Settings,
  Target,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/permissions";

export type NavKey =
  | "dashboard"
  | "today"
  | "sales"
  | "students"
  | "groups"
  | "teachers"
  | "finance"
  | "reports"
  | "mySalary"
  | "settings";

export interface NavItem {
  key: NavKey;
  /** /[branchId]/ dan keyingi segment */
  segment: string;
  icon: LucideIcon;
  /** Bittasi bo'lsa yetarli. Menyuda yashirish — qulaylik; sahifa o'zi ham tekshiradi. */
  permissions: readonly Permission[];
  /** Ruxsat o'rniga: faqat ustozlarga (Mening oyligim) */
  teacherOnly?: boolean;
}

export const SETTINGS_PERMISSIONS: readonly Permission[] = [
  "settings.organization",
  "settings.branches",
  "settings.roles",
  "settings.staff",
  "settings.catalogs",
  "settings.integrations",
  "settings.billing",
];

/** Sidebar tartibi (ROADMAP 0-bosqich). "More" menyusi yo'q — hammasi ko'rinadi. */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "dashboard",
    segment: "dashboard",
    icon: LayoutDashboard,
    permissions: ["dashboard.view"],
  },
  {
    key: "today",
    segment: "today",
    icon: CalendarCheck,
    permissions: ["attendance.view", "attendance.manage"],
  },
  { key: "sales", segment: "sales", icon: Target, permissions: ["leads.view"] },
  { key: "students", segment: "students", icon: Users, permissions: ["students.view"] },
  { key: "groups", segment: "groups", icon: UsersRound, permissions: ["groups.view"] },
  { key: "teachers", segment: "teachers", icon: GraduationCap, permissions: ["groups.view"] },
  {
    key: "finance",
    segment: "finance",
    icon: Wallet,
    permissions: ["payments.view", "expenses.view", "cash.view", "salary.view"],
  },
  { key: "reports", segment: "reports", icon: ChartColumn, permissions: ["reports.view"] },
  { key: "mySalary", segment: "my-salary", icon: Banknote, permissions: [], teacherOnly: true },
  { key: "settings", segment: "settings", icon: Settings, permissions: SETTINGS_PERMISSIONS },
];

export const ALL_BRANCHES = "all";
