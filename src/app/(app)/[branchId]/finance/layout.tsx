import { getTranslations } from "next-intl/server";

import { SubNav } from "@/components/sub-nav";
import { requirePagePermission } from "@/lib/auth";

/** Moliya: Qarzdorlar va Tushumlar. Xarajatlar, kassa, ish haqi — 7-bosqich. */
export default async function FinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  await requirePagePermission("payments.view");
  const t = await getTranslations("billing");
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("finance.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("finance.soon")}</p>
      </div>
      <SubNav
        items={[
          { href: `/${branchId}/finance`, label: t("debtors.title") },
          { href: `/${branchId}/finance/payments`, label: t("payments.title") },
        ]}
      />
      {children}
    </div>
  );
}
