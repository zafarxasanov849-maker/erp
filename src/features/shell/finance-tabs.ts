import type { Permission } from "@/lib/permissions";

/** Moliya bo'limi yorliqlari va ularga kerakli ruxsat (bittasi yetarli). */
export type FinanceTab = "debtors" | "payments" | "expenses" | "cash" | "salary";

export const FINANCE_TABS: readonly {
  key: FinanceTab;
  segment: string;
  permissions: readonly Permission[];
}[] = [
  { key: "debtors", segment: "", permissions: ["payments.view"] },
  { key: "payments", segment: "payments", permissions: ["payments.view"] },
  { key: "expenses", segment: "expenses", permissions: ["expenses.view"] },
  { key: "cash", segment: "cash", permissions: ["cash.view", "cash.handover"] },
  { key: "salary", segment: "salary", permissions: ["salary.view"] },
];
