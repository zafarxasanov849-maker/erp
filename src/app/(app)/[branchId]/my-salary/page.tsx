import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MonthNav } from "@/features/salary/components/month-nav";
import { SalaryBreakdown } from "@/features/salary/components/salary-breakdown";
import { SalaryEntriesList } from "@/features/salary/components/salary-entry-dialog";
import { SalaryHistory } from "@/features/salary/components/salary-history";
import { buildStaffSalary, parseMonth } from "@/features/salary/queries";
import { getOrgContext } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("mySalary") };
}

/** Mening oyligim: faqat o'zi ko'radi (RLS: salary_rules/entries — o'z yozuvlari; payroll_group_stats — o'zi) */
export default async function MySalaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const ctx = await getOrgContext();
  const t = await getTranslations("salary");
  const tn = await getTranslations("nav");
  const month = parseMonth((await searchParams).month);
  const data = await buildStaffSalary(ctx.membership.orgId, ctx.membership.staffId, month);
  const base = `/${branchId}/my-salary`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{tn("mySalary")}</h1>
          <p className="text-sm text-muted-foreground">{t("myHint")}</p>
        </div>
        <MonthNav month={month} basePath={base} />
      </div>
      <SalaryBreakdown lines={data.selected.lines} summary={data.selected} rules={data.rules} />
      <section className="space-y-2" aria-labelledby="my-entries">
        <h2 id="my-entries" className="font-semibold">
          {t("entries")}
        </h2>
        <SalaryEntriesList entries={data.entries} canManage={false} />
      </section>
      <SalaryHistory history={data.history} totalDue={data.totalDue} basePath={base} />
    </div>
  );
}
