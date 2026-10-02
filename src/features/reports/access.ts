import type { Permission } from "@/lib/permissions";

import type { ReportKind } from "./search-params";

/** Har hisobotga kerakli ruxsat (bittasi yetarli). SQL funksiyalari ham o'zi tekshiradi. */
export const REPORT_PERMISSIONS: Record<ReportKind, readonly Permission[]> = {
  finance: ["reports.finance"],
  attendance: ["reports.view"],
  students: ["reports.view"],
  sales: ["reports.view"],
};
