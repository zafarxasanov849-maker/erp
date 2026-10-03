import { getTranslations } from "next-intl/server";

import { SubNav } from "@/components/sub-nav";
import { FINANCE_TABS } from "@/features/shell/finance-tabs";
import { NAV_ITEMS } from "@/features/shell/nav";
import { canAny, requirePagePermission } from "@/lib/auth";

/** Moliya: Qarzdorlar, Tushumlar, Xarajatlar, Kassa, Ish haqi — ruxsatga qarab. */
export default async function FinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission(NAV_ITEMS.find((i) => i.key === "finance")!.permissions);
  const t = await getTranslations("finance.tabs");
  const title = (await getTranslations("nav"))("finance");
  const items = FINANCE_TABS.filter((tab) => canAny(ctx, tab.permissions)).map((tab) => ({
    href: `/${branchId}/finance${tab.segment ? `/${tab.segment}` : ""}`,
    label: t(tab.key),
  }));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <SubNav items={items} />
      {children}
    </div>
  );
}
