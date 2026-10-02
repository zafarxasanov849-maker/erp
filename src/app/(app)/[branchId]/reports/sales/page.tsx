import { Target } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { REPORT_PERMISSIONS } from "@/features/reports/access";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("tabs.sales") };
}

/** Sotuv hisoboti — lidlar 8-bosqichda */
export default async function SalesReportPage() {
  await requirePagePermission(REPORT_PERMISSIONS.sales);
  const t = await getTranslations("reports.sales");
  return <EmptyState icon={Target} title={t("soonTitle")} description={t("soonDescription")} />;
}
