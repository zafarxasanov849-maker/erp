import {
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

export type NavKey =
  "dashboard" | "sales" | "students" | "groups" | "teachers" | "finance" | "reports" | "settings";

export interface NavItem {
  key: NavKey;
  /** /[branchId]/ dan keyingi segment */
  segment: string;
  icon: LucideIcon;
}

/** Sidebar tartibi (PRD/ROADMAP 0-bosqich). "More" menyusi yo'q — hammasi ko'rinadi. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", segment: "dashboard", icon: LayoutDashboard },
  { key: "sales", segment: "sales", icon: Target },
  { key: "students", segment: "students", icon: Users },
  { key: "groups", segment: "groups", icon: UsersRound },
  { key: "teachers", segment: "teachers", icon: GraduationCap },
  { key: "finance", segment: "finance", icon: Wallet },
  { key: "reports", segment: "reports", icon: ChartColumn },
  { key: "settings", segment: "settings", icon: Settings },
];

export const ALL_BRANCHES = "all";
