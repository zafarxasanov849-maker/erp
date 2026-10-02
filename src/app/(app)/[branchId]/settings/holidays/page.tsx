import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { listBranches } from "@/features/branches/queries";
import { HolidaysTable } from "@/features/holidays/components/holidays-table";
import { listHolidays } from "@/features/holidays/queries";
import { requirePagePermission } from "@/lib/auth";
import { todayInTashkent } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("holidays") };
}

export default async function HolidaysSettingsPage() {
  const ctx = await requirePagePermission("settings.catalogs");
  const orgId = ctx.membership.orgId;
  const [holidays, branches] = await Promise.all([listHolidays(orgId), listBranches(orgId)]);
  return (
    <HolidaysTable
      holidays={holidays}
      branches={branches.filter((b) => b.is_active).map((b) => ({ id: b.id, name: b.name }))}
      today={todayInTashkent()}
    />
  );
}
