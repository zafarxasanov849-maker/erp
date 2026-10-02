import { CalendarCheck, ClipboardCheck, Clock, UserCheck, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { REPORT_PERMISSIONS } from "@/features/reports/access";
import { ReportToolbar } from "@/features/reports/components/report-toolbar";
import { buildAttendanceReport } from "@/features/reports/data";
import { loadReportPeriod } from "@/features/reports/search-params";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { can, requirePagePermission } from "@/lib/auth";
import { todayInTashkent } from "@/lib/dates";
import { type AttendanceCounts, attendanceRates } from "@/lib/metrics/rates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("tabs.attendance") };
}

const pct = (v: number | null) => (v === null ? "—" : `${String(v).replace(".", ",")}%`);

/** Davomat hisoboti: guruhlar va ustozlar kesimida, eng ko'p qoldirganlar (PRD §6). */
export default async function AttendanceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission(REPORT_PERMISSIONS.attendance);
  const t = await getTranslations("reports.attendance");
  const ta = await getTranslations("attendance.statuses");
  const period = await loadReportPeriod(searchParams, todayInTashkent());
  const branch = branchId === ALL_BRANCHES ? null : branchId;
  const data = await buildAttendanceReport(ctx.membership.orgId, branch, period);
  const totals = attendanceRates(data.totals);
  const base = `/${branchId}`;

  const countCells = (c: AttendanceCounts) => {
    const r = attendanceRates(c);
    return (
      <>
        <TableCell className="text-right tabular-nums">{pct(r.markedPct)}</TableCell>
        <TableCell className="text-right tabular-nums">{pct(r.attendedPct)}</TableCell>
        <TableCell className="hidden text-right tabular-nums md:table-cell">{c.present}</TableCell>
        <TableCell className="hidden text-right tabular-nums md:table-cell">{c.late}</TableCell>
        <TableCell className="hidden text-right tabular-nums md:table-cell">{c.absent}</TableCell>
        <TableCell className="hidden text-right tabular-nums md:table-cell">{c.excused}</TableCell>
        <TableCell className="hidden text-right tabular-nums lg:table-cell">
          {c.late_marked}
        </TableCell>
      </>
    );
  };
  const countHeads = (
    <>
      <TableHead className="text-right">{t("markedPct")}</TableHead>
      <TableHead className="text-right">{t("attendedPct")}</TableHead>
      <TableHead className="hidden text-right md:table-cell">{ta("present")}</TableHead>
      <TableHead className="hidden text-right md:table-cell">{ta("late")}</TableHead>
      <TableHead className="hidden text-right md:table-cell">{ta("absent")}</TableHead>
      <TableHead className="hidden text-right md:table-cell">{ta("excused")}</TableHead>
      <TableHead className="hidden text-right lg:table-cell">{t("lateMarked")}</TableHead>
    </>
  );

  return (
    <div className="space-y-6">
      <ReportToolbar kind="attendance" branchId={branchId} period={period} canExport />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          testId="report-marked"
          label={t("markedPct")}
          icon={ClipboardCheck}
          value={pct(totals.markedPct)}
          hint={t("markedHint", { marked: data.totals.marked, cells: data.totals.cells })}
        />
        <StatCard
          testId="report-attended"
          label={t("attendedPct")}
          icon={UserCheck}
          value={pct(totals.attendedPct)}
          hint={t("attendedHint")}
        />
        <StatCard
          testId="report-absent"
          label={ta("absent")}
          icon={UserX}
          value={data.totals.absent}
          hint={t("excusedHint", { count: data.totals.excused })}
        />
        <StatCard
          label={t("lateMarked")}
          icon={Clock}
          value={data.totals.late_marked}
          hint={t("lateMarkedHint")}
        />
      </div>

      {data.totals.cells === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <>
          <section className="space-y-2" aria-labelledby="att-groups">
            <h2 id="att-groups" className="font-semibold">
              {t("byGroup")}
            </h2>
            <div
              className="min-w-0 overflow-x-auto rounded-lg border"
              data-testid="attendance-groups"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("group")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("teacher")}</TableHead>
                    {countHeads}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.groups.map((g) => (
                    <TableRow key={g.id} data-group={g.name}>
                      <TableCell>
                        <Link
                          href={`${base}/groups/${g.id}`}
                          className="font-medium hover:underline"
                        >
                          {g.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{g.teacher ?? "—"}</TableCell>
                      {countCells(g)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2" aria-labelledby="att-teachers">
            <h2 id="att-teachers" className="font-semibold">
              {t("byTeacher")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("byTeacherHint")}</p>
            <div className="min-w-0 overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("teacher")}</TableHead>
                    {countHeads}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.teachers.map((x) => (
                    <TableRow key={x.id ?? "none"}>
                      <TableCell className="font-medium">{x.name || t("noTeacher")}</TableCell>
                      {countCells(x)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2" aria-labelledby="att-absent">
            <h2 id="att-absent" className="font-semibold">
              {t("topAbsent")}
            </h2>
            {data.absent_students.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {t("noAbsent")}
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.absent_students.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    {can(ctx, "students.view") ? (
                      <Link
                        href={`${base}/students/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{s.name}</span>
                    )}
                    <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                      {t("absentOf", { absent: s.absent, marked: s.marked })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
