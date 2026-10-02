import { getTranslations } from "next-intl/server";

import { SubNav } from "@/components/sub-nav";
import { REPORT_PERMISSIONS } from "@/features/reports/access";
import { REPORT_KINDS } from "@/features/reports/search-params";
import { canAny, requirePagePermission } from "@/lib/auth";

export default async function ReportsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission(["reports.view", "reports.finance"]);
  const t = await getTranslations("reports");
  const items = REPORT_KINDS.filter((k) => canAny(ctx, REPORT_PERMISSIONS[k])).map((k) => ({
    href: `/${branchId}/reports/${k}`,
    label: t(`tabs.${k}`),
  }));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <SubNav items={items} />
      {children}
    </div>
  );
}
