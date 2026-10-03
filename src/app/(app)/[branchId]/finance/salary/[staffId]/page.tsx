import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getMethodsWithHand } from "@/features/expenses/queries";
import { MonthNav } from "@/features/salary/components/month-nav";
import { SalaryBreakdown } from "@/features/salary/components/salary-breakdown";
import {
  SalaryEntriesList,
  SalaryEntryButtons,
} from "@/features/salary/components/salary-entry-dialog";
import { SalaryHistory } from "@/features/salary/components/salary-history";
import { SalaryRulesPanel } from "@/features/salary/components/salary-rules-panel";
import { buildStaffSalary, parseMonth } from "@/features/salary/queries";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { listStaff } from "@/features/staff/queries";
import { unwrap } from "@/lib/action";
import { can, requirePagePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("salary");
  return { title: t("title") };
}

/** Xodim oyligi: tafsilot, yozuvlar, kelishuvlar, oylar qoldig'i */
export default async function StaffSalaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string; staffId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId, staffId } = await params;
  const ctx = await requirePagePermission("salary.view");
  const t = await getTranslations("salary");
  const month = parseMonth((await searchParams).month);
  const orgId = ctx.membership.orgId;
  const staff = (await listStaff(orgId)).find((s) => s.id === staffId);
  if (!staff) notFound();
  const supabase = await createClient();
  const [data, methods, groups] = await Promise.all([
    buildStaffSalary(orgId, staffId, month),
    getMethodsWithHand(orgId),
    supabase.from("groups").select("id, name").eq("organization_id", orgId).order("name"),
  ]);
  const canManage = can(ctx, "salary.manage");
  const base = `/${branchId}/finance/salary`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`${base}?month=${month}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {t("title")}
          </Link>
          <h2 className="text-xl font-semibold" data-testid="salary-staff-name">
            {staff.fullName}
          </h2>
          <p className="text-sm text-muted-foreground">{staff.roleName}</p>
        </div>
        <MonthNav month={month} basePath={`${base}/${staffId}`} />
      </div>

      {canManage && (
        <SalaryEntryButtons
          options={{
            staffId,
            month,
            due: data.selected.due,
            methods: methods
              .filter((m) => m.isActive && !m.isParent)
              .map((m) => ({ id: m.id, name: m.name, inHand: m.inHand })),
            branches: ctx.branches,
            defaultBranchId:
              (branchId !== ALL_BRANCHES ? branchId : staff.branchIds[0]) ??
              ctx.branches[0]?.id ??
              "",
          }}
        />
      )}

      <SalaryBreakdown lines={data.selected.lines} summary={data.selected} rules={data.rules} />

      <section className="space-y-2" aria-labelledby="salary-entries-title">
        <h2 id="salary-entries-title" className="font-semibold">
          {t("entries")}
        </h2>
        <SalaryEntriesList entries={data.entries} canManage={canManage} />
      </section>

      <SalaryRulesPanel
        staffId={staffId}
        rules={data.rules}
        groups={unwrap(groups)}
        canManage={canManage}
      />

      <SalaryHistory
        history={data.history}
        totalDue={data.totalDue}
        basePath={`${base}/${staffId}`}
      />
    </div>
  );
}
