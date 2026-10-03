import { Banknote, ChartColumn, Receipt, TrendingDown, TrendingUp, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyAmount } from "@/features/billing/components/student-ledger";
import { BarChartView } from "@/features/dashboard/components/bar-chart-view";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { REPORT_PERMISSIONS } from "@/features/reports/access";
import { ReportToolbar } from "@/features/reports/components/report-toolbar";
import { buildFinanceReport } from "@/features/reports/data";
import { loadReportPeriod } from "@/features/reports/search-params";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { requirePagePermission } from "@/lib/auth";
import { todayInTashkent } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("tabs.finance") };
}

/** Moliya hisoboti: tushum, xarajatlar, sof foyda, ortgan pul (A); tushum oy × filial. */
export default async function FinanceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission(REPORT_PERMISSIONS.finance);
  const t = await getTranslations("reports.finance");
  const tm = await getTranslations("months");
  const tk = await getTranslations("expenses.kinds");
  const period = await loadReportPeriod(searchParams, todayInTashkent());
  const branch = branchId === ALL_BRANCHES ? null : branchId;
  const data = await buildFinanceReport(ctx.membership.orgId, branch, period);
  const monthName = (m: string) => `${tm(String(Number(m.slice(5))) as "1")} ${m.slice(0, 4)}`;
  const perBranch = branch === null && data.columns.length > 1;

  return (
    <div className="space-y-6">
      <ReportToolbar kind="finance" branchId={branchId} period={period} canExport />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          testId="report-revenue"
          label={t("revenue")}
          icon={Banknote}
          value={formatMoney(data.total.revenue)}
          hint={t("revenueStats", {
            payers: data.total.payers,
            average: formatMoney(data.average),
          })}
        />
        <StatCard
          testId="report-expenses"
          label={t("expenses")}
          icon={TrendingDown}
          value={formatMoney(data.profit.costs)}
          hint={t("expensesHint")}
        />
        <StatCard
          testId="report-profit"
          label={t("profit")}
          icon={TrendingUp}
          value={formatMoney(data.profit.netProfit)}
          hint={t("profitHint")}
        />
        <StatCard
          testId="report-owner-draw"
          label={t("ownerDraw")}
          icon={Receipt}
          value={formatMoney(data.profit.ownerDraw)}
          hint={t("ownerDrawHint")}
        />
        <StatCard
          testId="report-leftover"
          label={t("leftover")}
          icon={Users}
          value={formatMoney(data.profit.leftover)}
          hint={t("leftoverHint")}
        />
      </div>

      {data.total.revenue === 0 && data.profit.costs + data.profit.ownerDraw === 0 ? (
        <EmptyState
          icon={ChartColumn}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <>
          {data.months.length > 1 && (
            <section className="min-w-0 rounded-xl border p-4" aria-labelledby="finance-chart">
              <h2 id="finance-chart" className="mb-3 font-semibold">
                {t("chart")}
              </h2>
              <BarChartView
                label={t("chart")}
                data={data.months.map((m) => ({
                  month: monthName(m.month),
                  revenue: m.revenue,
                  costs: m.costs,
                }))}
                categoryKey="month"
                format="money"
                series={[
                  { key: "revenue", label: t("revenue"), color: "var(--series-1)" },
                  { key: "costs", label: t("expenses"), color: "var(--series-2)" },
                ]}
              />
            </section>
          )}

          <section className="space-y-2" aria-labelledby="finance-pl">
            <h2 id="finance-pl" className="font-semibold">
              {t("plTable")}
            </h2>
            <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="finance-pl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("month")}</TableHead>
                    <TableHead className="text-right">{t("revenue")}</TableHead>
                    <TableHead className="text-right">{t("expenses")}</TableHead>
                    <TableHead className="text-right">{t("profit")}</TableHead>
                    <TableHead className="text-right">{t("ownerDraw")}</TableHead>
                    <TableHead className="text-right">{t("leftover")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.months.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="whitespace-nowrap">{monthName(m.month)}</TableCell>
                      {[m.revenue, m.costs, m.netProfit, m.ownerDraw, m.leftover].map((v, i) => (
                        <TableCell key={i} className="text-right whitespace-nowrap tabular-nums">
                          <MoneyAmount value={v} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>{t("total")}</TableCell>
                    {[
                      data.profit.revenue,
                      data.profit.costs,
                      data.profit.netProfit,
                      data.profit.ownerDraw,
                      data.profit.leftover,
                    ].map((v, i) => (
                      <TableCell key={i} className="text-right whitespace-nowrap tabular-nums">
                        <MoneyAmount value={v} />
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </section>

          {data.expensesByKind.length > 0 && (
            <section className="space-y-2" aria-labelledby="finance-kinds">
              <h2 id="finance-kinds" className="font-semibold">
                {t("byKind")}
              </h2>
              <ul className="divide-y rounded-lg border" data-testid="finance-kinds">
                {data.expensesByKind.map((k) => (
                  <li key={k.kind} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span>{tk(k.kind)}</span>
                    <span className="font-medium whitespace-nowrap tabular-nums">
                      {formatMoney(k.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2" aria-labelledby="finance-table">
            <h2 id="finance-table" className="font-semibold">
              {t("table")}
            </h2>
            {perBranch && (
              <p className="text-xs text-muted-foreground sm:hidden">{t("mobileHint")}</p>
            )}
            <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="finance-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("month")}</TableHead>
                    {perBranch &&
                      data.columns.map((b) => (
                        <TableHead key={b.id} className="hidden text-right sm:table-cell">
                          {b.name}
                        </TableHead>
                      ))}
                    <TableHead className="text-right">{t("total")}</TableHead>
                    <TableHead className="text-right">{t("payments")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.months.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="whitespace-nowrap">{monthName(m.month)}</TableCell>
                      {perBranch &&
                        data.columns.map((b) => (
                          <TableCell
                            key={b.id}
                            className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell"
                          >
                            {formatMoney(m.byBranch[b.id] ?? 0)}
                          </TableCell>
                        ))}
                      <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                        {formatMoney(m.revenue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{m.payments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>{t("total")}</TableCell>
                    {perBranch &&
                      data.columns.map((b) => (
                        <TableCell
                          key={b.id}
                          className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell"
                        >
                          {formatMoney(
                            data.months.reduce((s, m) => s + (m.byBranch[b.id] ?? 0), 0),
                          )}
                        </TableCell>
                      ))}
                    <TableCell
                      className="text-right whitespace-nowrap tabular-nums"
                      data-testid="finance-total"
                    >
                      {formatMoney(data.total.revenue)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{data.total.payments}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
