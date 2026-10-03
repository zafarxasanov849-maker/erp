import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { FinanceSettings } from "@/features/expenses/components/finance-settings";
import { getExpenseCategories, getMethodsWithHand } from "@/features/expenses/queries";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("finance") };
}

export default async function FinanceSettingsPage() {
  const ctx = await requirePagePermission("settings.catalogs");
  const [categories, methods] = await Promise.all([
    getExpenseCategories(ctx.membership.orgId),
    getMethodsWithHand(ctx.membership.orgId),
  ]);
  return <FinanceSettings categories={categories} methods={methods} />;
}
