import { RotateCcw, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChartView } from "@/features/dashboard/components/bar-chart-view";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { REPORT_PERMISSIONS } from "@/features/reports/access";
import { ReportToolbar } from "@/features/reports/components/report-toolbar";
import { buildStudentsReport } from "@/features/reports/data";
import { loadReportPeriod } from "@/features/reports/search-params";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { can, requirePagePermission } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("tabs.students") };
}

/** Talabalar oqimi: yangi, faollashgan, muzlatilgan, ketgan (sabablari), qaytgan — oy bo'yicha. */
export default async function StudentsReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission(REPORT_PERMISSIONS.students);
  const t = await getTranslations("reports.students");
  const tm = await getTranslations("months");
  const period = await loadReportPeriod(searchParams, todayInTashkent());
  const branch = branchId === ALL_BRANCHES ? null : branchId;
  const data = await buildStudentsReport(ctx.membership.orgId, branch, period);
  const monthName = (m: string) => `${tm(String(Number(m.slice(5))) as "1")} ${m.slice(0, 4)}`;
  const base = `/${branchId}`;
  const canOpen = can(ctx, "students.view");

  return (
    <div className="space-y-6">
      <ReportToolbar kind="students" branchId={branchId} period={period} canExport />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          testId="report-new"
          label={t("new")}
          icon={UserPlus}
          value={data.totals.new}
          hint={t("newHint")}
        />
        <StatCard
          testId="report-activated"
          label={t("activated")}
          icon={UserCheck}
          value={data.totals.activated}
          hint={t("activatedHint")}
        />
        <StatCard
          testId="report-left"
          label={t("left")}
          icon={UserMinus}
          value={data.totals.left}
          hint={t("leftHint")}
        />
        <StatCard
          testId="report-returned"
          label={t("returned")}
          icon={RotateCcw}
          value={data.totals.returned}
          hint={t("returnedHint")}
        />
        <StatCard
          testId="report-active-end"
          label={t("activeAtEnd", { date: formatDate(period.to) })}
          icon={Users}
          value={data.atEnd.active}
          hint={t("atEndHint", { trial: data.atEnd.trial, frozen: data.atEnd.frozen })}
        />
      </div>

      {data.flow.length > 1 && (
        <section className="min-w-0 rounded-xl border p-4" aria-labelledby="flow-chart">
          <h2 id="flow-chart" className="mb-3 font-semibold">
            {t("chart")}
          </h2>
          <BarChartView
            label={t("chart")}
            data={data.flow.map((m) => ({ month: monthName(m.month), new: m.new, left: m.left }))}
            categoryKey="month"
            format="count"
            series={[
              { key: "new", label: t("new"), color: "var(--series-1)" },
              { key: "left", label: t("left"), color: "var(--series-2)" },
            ]}
          />
        </section>
      )}

      <section className="space-y-2" aria-labelledby="flow-table">
        <h2 id="flow-table" className="font-semibold">
          {t("byMonth")}
        </h2>
        <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="flow-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("month")}</TableHead>
                <TableHead className="text-right">{t("new")}</TableHead>
                <TableHead className="text-right">{t("activated")}</TableHead>
                <TableHead className="text-right">{t("frozen")}</TableHead>
                <TableHead className="text-right">{t("left")}</TableHead>
                <TableHead className="text-right">{t("returned")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.flow.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="whitespace-nowrap">{monthName(m.month)}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.new}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.activated}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.frozen}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.left}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.returned}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <section className="min-w-0 space-y-2" aria-labelledby="left-reasons">
          <h2 id="left-reasons" className="font-semibold">
            {t("reasons")}
          </h2>
          {data.reasons.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("noLeft")}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border" data-testid="left-reasons">
              {data.reasons.map((r) => (
                <li key={r.reason} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>{r.reason || t("noReason")}</span>
                  <span className="font-medium tabular-nums">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="min-w-0 space-y-2" aria-labelledby="left-list">
          <h2 id="left-list" className="font-semibold">
            {t("leftList")}
          </h2>
          {data.left.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("noLeftDescription")}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border" data-testid="left-list">
              {data.left.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                >
                  {canOpen ? (
                    <Link href={`${base}/students/${l.id}`} className="font-medium hover:underline">
                      {l.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{l.name}</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {formatDate(l.leftOn)} · {l.reason || t("noReason")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
