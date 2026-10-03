import { Banknote, ChartColumn, HandCoins, TrendingUp, UserMinus, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import {
  getBranchNames,
  getDebtSummary,
  getExpenseReport,
  getFinanceReport,
  getLeftStudents,
  getRevenue,
  getStudentCounts,
} from "@/features/metrics/queries";
import { type OrgContext, canAny } from "@/lib/auth";
import { type IsoDate, monthBounds } from "@/lib/dates";
import {
  lastMonths,
  monthToDate,
  sameDayLastMonth,
  samePeriodLastMonth,
} from "@/lib/metrics/period";
import { profitOf } from "@/lib/metrics/profit";
import { formatMoney } from "@/lib/money";

import { statChange } from "../format";
import { BarChartView } from "./bar-chart-view";
import { PanelSkeleton, StatCard, StatGridSkeleton } from "./stat-card";

interface Props {
  ctx: OrgContext;
  branchId: string | null;
  base: string;
  today: IsoDate;
}

/** Rahbar bosh sahifasi (PRD §3.10): tushum, qarzdorlik, faol talabalar, sof foyda, ketganlar. */
export function LeaderDashboard(props: Props) {
  const canMoney = canAny(props.ctx, ["payments.view", "reports.finance"]);
  return (
    <div className="space-y-6">
      <Suspense fallback={<StatGridSkeleton count={5} />}>
        <LeaderCards {...props} />
      </Suspense>
      {canMoney && (
        <Suspense
          fallback={
            <div className="grid gap-4 lg:grid-cols-2">
              <PanelSkeleton />
              <PanelSkeleton />
            </div>
          }
        >
          <LeaderCharts {...props} />
        </Suspense>
      )}
    </div>
  );
}

async function LeaderCards({ ctx, branchId, base, today }: Props) {
  const t = await getTranslations("dashboard");
  const org = ctx.membership.orgId;
  const canMoney = canAny(ctx, ["payments.view", "reports.finance"]);
  const canStudents = canAny(ctx, ["students.view", "reports.view"]);
  // Sof foyda: tushum va xarajatlarni ko'ra oladiganlar
  const canProfit = canMoney && canAny(ctx, ["expenses.view", "reports.finance"]);
  const mtd = monthToDate(today);
  const prev = samePeriodLastMonth(mtd);
  const prevDay = sameDayLastMonth(today);
  const none = Promise.resolve(null);

  const [revenue, revenuePrev, debt, debtPrev, counts, countsPrev, left, leftPrev, exp, expPrev] =
    await Promise.all([
      canMoney ? getRevenue(org, branchId, mtd.from, mtd.to) : none,
      canMoney ? getRevenue(org, branchId, prev.from, prev.to) : none,
      canMoney ? getDebtSummary(org, branchId, today) : none,
      canMoney ? getDebtSummary(org, branchId, prevDay) : none,
      canStudents ? getStudentCounts(org, branchId, today) : none,
      canStudents ? getStudentCounts(org, branchId, prevDay) : none,
      canStudents ? getLeftStudents(org, branchId, mtd.from, mtd.to) : none,
      canStudents ? getLeftStudents(org, branchId, prev.from, prev.to) : none,
      canProfit ? getExpenseReport(org, branchId, mtd.from, mtd.to) : none,
      canProfit ? getExpenseReport(org, branchId, prev.from, prev.to) : none,
    ]);
  const profit = revenue && exp ? profitOf(revenue.revenue, exp) : null;
  const profitPrev = revenuePrev && expPrev ? profitOf(revenuePrev.revenue, expPrev) : null;

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
      data-testid="leader-cards"
    >
      {revenue && revenuePrev && (
        <StatCard
          testId="card-revenue"
          label={t("cards.revenue")}
          icon={Banknote}
          value={formatMoney(revenue.revenue)}
          href={`${base}/reports/finance`}
          change={await statChange(revenue.revenue, revenuePrev.revenue, "up", "flow")}
          hint={t("cards.revenueHint", { payers: revenue.payers })}
        />
      )}
      {debt && debtPrev && (
        <StatCard
          testId="card-debt"
          label={t("cards.debt")}
          icon={HandCoins}
          value={formatMoney(debt.total)}
          href={`${base}/finance`}
          change={await statChange(debt.total, debtPrev.total, "down", "stock")}
          hint={t("cards.debtHint", { count: debt.count })}
        />
      )}
      {counts && countsPrev && (
        <StatCard
          testId="card-active"
          label={t("cards.active")}
          icon={Users}
          value={counts.active}
          href={`${base}/students?status=active`}
          change={await statChange(counts.active, countsPrev.active, "up", "stock")}
          hint={t("cards.activeHint", { trial: counts.trial, frozen: counts.frozen })}
        />
      )}
      {profit && profitPrev && (
        <StatCard
          testId="card-profit"
          label={t("cards.profit")}
          icon={TrendingUp}
          value={formatMoney(profit.netProfit)}
          href={`${base}/reports/finance`}
          change={await statChange(profit.netProfit, profitPrev.netProfit, "up", "flow")}
          hint={t("cards.profitHint", { amount: formatMoney(profit.costs) })}
        />
      )}
      {left && leftPrev && (
        <StatCard
          testId="card-left"
          label={t("cards.left")}
          icon={UserMinus}
          value={left.length}
          href={`${base}/reports/students`}
          change={await statChange(left.length, leftPrev.length, "down", "flow")}
          hint={t("cards.leftHint")}
        />
      )}
    </div>
  );
}

async function LeaderCharts({ ctx, branchId, today }: Props) {
  const t = await getTranslations();
  const tm = await getTranslations("monthsShort");
  const org = ctx.membership.orgId;
  const months = lastMonths(today, 6);
  const [from] = monthBounds(months[0]!);
  const showBranches = branchId === null && ctx.branches.length > 1;
  const [rows, names] = await Promise.all([
    getFinanceReport(org, branchId, from, today),
    showBranches ? getBranchNames(org) : Promise.resolve([]),
  ]);

  const byMonth = months.map((m) => ({
    month: tm(String(Number(m.slice(5))) as "1"),
    revenue: rows.filter((r) => r.month === m).reduce((s, r) => s + r.revenue, 0),
  }));
  const current = today.slice(0, 7);
  const byBranch = names
    .map((b) => ({
      branch: b.name,
      isActive: b.isActive,
      revenue: rows
        .filter((r) => r.month === current && r.branchId === b.id)
        .reduce((s, r) => s + r.revenue, 0),
    }))
    .filter((b) => b.isActive || b.revenue > 0)
    .map(({ branch, revenue }) => ({ branch, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
  const empty = rows.length === 0;

  return (
    <div className={showBranches ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
      <section className="min-w-0 rounded-xl border p-4" aria-labelledby="chart-revenue">
        <h2 id="chart-revenue" className="font-semibold">
          {t("dashboard.charts.revenue")}
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">{t("dashboard.charts.revenueHint")}</p>
        {empty ? (
          <EmptyState
            icon={ChartColumn}
            title={t("dashboard.charts.emptyTitle")}
            description={t("dashboard.charts.emptyDescription")}
            className="py-10"
          />
        ) : (
          <BarChartView
            label={t("dashboard.charts.revenue")}
            data={byMonth}
            categoryKey="month"
            format="money"
            series={[
              {
                key: "revenue",
                label: t("dashboard.charts.revenueSeries"),
                color: "var(--series-1)",
              },
            ]}
          />
        )}
      </section>
      {showBranches && (
        <section className="min-w-0 rounded-xl border p-4" aria-labelledby="chart-branches">
          <h2 id="chart-branches" className="font-semibold">
            {t("dashboard.charts.branches")}
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">{t("dashboard.charts.branchesHint")}</p>
          {byBranch.every((b) => b.revenue === 0) ? (
            <EmptyState
              icon={ChartColumn}
              title={t("dashboard.charts.branchesEmptyTitle")}
              description={t("dashboard.charts.emptyDescription")}
              className="py-10"
            />
          ) : (
            <BarChartView
              label={t("dashboard.charts.branches")}
              data={byBranch}
              categoryKey="branch"
              format="money"
              layout="horizontal"
              height={Math.max(160, byBranch.length * 44)}
              series={[
                {
                  key: "revenue",
                  label: t("dashboard.charts.revenueSeries"),
                  color: "var(--series-1)",
                },
              ]}
            />
          )}
        </section>
      )}
    </div>
  );
}
