"use server";

import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";

import { ALL_BRANCHES } from "@/features/shell/nav";
import { ActionError, type ActionResult, runAction } from "@/lib/action";
import { canAny, getOrgContext } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { attendanceRates } from "@/lib/metrics/rates";

import { REPORT_PERMISSIONS } from "./access";
import { buildAttendanceReport, buildFinanceReport, buildStudentsReport } from "./data";
import { REPORT_KINDS, type ReportKind, loadReportPeriod } from "./search-params";

const MONEY = "# ##0";
const PCT = "0.0%";

function sheet(wb: ExcelJS.Workbook, name: string, columns: Partial<ExcelJS.Column>[]) {
  const ws = wb.addWorksheet(name.slice(0, 31));
  ws.columns = columns;
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return ws;
}

/**
 * Hisobotni Excel (.xlsx) ga — sahifadagi bilan aynan bir xil ma'lumot (features/reports/data.ts).
 * Davr URL query satridan olinadi va serverda qayta tekshiriladi.
 */
export async function exportReport(
  kind: ReportKind,
  branchId: string,
  query: string,
): Promise<ActionResult<{ fileName: string; base64: string }>> {
  return runAction(async () => {
    if (!REPORT_KINDS.includes(kind) || kind === "sales") throw new ActionError("errors.forbidden");
    const ctx = await getOrgContext();
    if (!canAny(ctx, REPORT_PERMISSIONS[kind])) throw new ActionError("errors.forbidden");
    const allowed =
      branchId === ALL_BRANCHES
        ? ctx.membership.allBranches
        : ctx.branches.some((b) => b.id === branchId);
    if (!allowed) throw new ActionError("errors.forbidden");

    const org = ctx.membership.orgId;
    const branch = branchId === ALL_BRANCHES ? null : branchId;
    const period = await loadReportPeriod(new URLSearchParams(query), todayInTashkent());
    const t = await getTranslations("reports");
    const tm = await getTranslations("months");
    const ta = await getTranslations("attendance.statuses");
    const monthName = (m: string) => `${tm(String(Number(m.slice(5))) as "1")} ${m.slice(0, 4)}`;
    const branchName =
      branch === null ? t("allBranches") : (ctx.branches.find((b) => b.id === branch)?.name ?? "");

    const wb = new ExcelJS.Workbook();
    wb.creator = ctx.membership.orgName;
    const info = sheet(wb, t("excel.info"), [
      { key: "k", width: 22 },
      { key: "v", width: 40 },
    ]);
    info.getRow(1).font = {};
    info.addRows([
      { k: t("excel.report"), v: t(`tabs.${kind}`) },
      { k: t("excel.org"), v: ctx.membership.orgName },
      { k: t("excel.branch"), v: branchName },
      { k: t("period"), v: `${formatDate(period.from)} – ${formatDate(period.to)}` },
      { k: t("excel.generated"), v: formatDate(todayInTashkent()) },
    ]);
    info.getColumn("k").font = { bold: true };

    if (kind === "finance") {
      const tf = await getTranslations("reports.finance");
      const data = await buildFinanceReport(org, branch, period);
      const perBranch = branch === null && data.columns.length > 1;
      const ws = sheet(wb, t("tabs.finance"), [
        { header: tf("month"), key: "month", width: 18 },
        ...(perBranch
          ? data.columns.map((b) => ({
              header: b.name,
              key: b.id,
              width: 16,
              style: { numFmt: MONEY },
            }))
          : []),
        { header: tf("total"), key: "total", width: 16, style: { numFmt: MONEY } },
        { header: tf("payments"), key: "payments", width: 12 },
      ]);
      for (const m of data.months) {
        ws.addRow({
          month: monthName(m.month),
          ...m.byBranch,
          total: m.revenue,
          payments: m.payments,
        });
      }
      const last = ws.addRow({
        month: tf("total"),
        ...Object.fromEntries(
          data.columns.map((b) => [
            b.id,
            data.months.reduce((s, m) => s + (m.byBranch[b.id] ?? 0), 0),
          ]),
        ),
        total: data.total.revenue,
        payments: data.total.payments,
      });
      last.font = { bold: true };
      info.addRows([
        {},
        { k: tf("revenue"), v: data.total.revenue },
        { k: tf("payers"), v: data.total.payers },
        { k: tf("average"), v: data.average },
      ]);
    }

    if (kind === "attendance") {
      const tt = await getTranslations("reports.attendance");
      const data = await buildAttendanceReport(org, branch, period);
      const counts = [
        { header: tt("cells"), key: "cells", width: 10 },
        { header: tt("markedPct"), key: "markedPct", width: 14, style: { numFmt: PCT } },
        { header: tt("attendedPct"), key: "attendedPct", width: 14, style: { numFmt: PCT } },
        { header: ta("present"), key: "present", width: 10 },
        { header: ta("late"), key: "late", width: 10 },
        { header: ta("absent"), key: "absent", width: 10 },
        { header: ta("excused"), key: "excused", width: 10 },
        { header: tt("lateMarked"), key: "late_marked", width: 18 },
      ];
      const rates = (c: Parameters<typeof attendanceRates>[0]) => {
        const r = attendanceRates(c);
        return {
          ...c,
          markedPct: r.markedPct === null ? null : r.markedPct / 100,
          attendedPct: r.attendedPct === null ? null : r.attendedPct / 100,
        };
      };
      const groups = sheet(wb, tt("byGroup"), [
        { header: tt("group"), key: "name", width: 24 },
        { header: tt("teacher"), key: "teacher", width: 24 },
        ...counts,
      ]);
      for (const g of data.groups) groups.addRow({ ...rates(g), teacher: g.teacher ?? "" });
      groups.addRow({ ...rates(data.totals), name: tt("total") }).font = { bold: true };
      const teachers = sheet(wb, tt("byTeacher"), [
        { header: tt("teacher"), key: "name", width: 24 },
        ...counts,
      ]);
      for (const x of data.teachers)
        teachers.addRow({ ...rates(x), name: x.name || tt("noTeacher") });
      const absent = sheet(wb, tt("topAbsent"), [
        { header: tt("student"), key: "name", width: 30 },
        { header: ta("absent"), key: "absent", width: 10 },
        { header: tt("markedLessons"), key: "marked", width: 16 },
      ]);
      for (const s of data.absent_students) absent.addRow(s);
    }

    if (kind === "students") {
      const ts = await getTranslations("reports.students");
      const data = await buildStudentsReport(org, branch, period);
      const flow = sheet(wb, ts("byMonth"), [
        { header: ts("month"), key: "month", width: 18 },
        { header: ts("new"), key: "new", width: 12 },
        { header: ts("activated"), key: "activated", width: 14 },
        { header: ts("frozen"), key: "frozen", width: 14 },
        { header: ts("left"), key: "left", width: 12 },
        { header: ts("returned"), key: "returned", width: 12 },
      ]);
      for (const m of data.flow) flow.addRow({ ...m, month: monthName(m.month) });
      flow.addRow({ ...data.totals, month: ts("total") }).font = { bold: true };
      const left = sheet(wb, ts("leftList"), [
        { header: ts("student"), key: "name", width: 30 },
        { header: ts("leftOn"), key: "leftOn", width: 14 },
        { header: ts("reason"), key: "reason", width: 30 },
      ]);
      for (const l of data.left) {
        left.addRow({
          name: l.name,
          leftOn: formatDate(l.leftOn),
          reason: l.reason || ts("noReason"),
        });
      }
      info.addRows([
        {},
        { k: ts("activeAtEnd", { date: formatDate(period.to) }), v: data.atEnd.active },
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    return {
      fileName: `${t(`files.${kind}`)}-${formatDate(period.from)}-${formatDate(period.to)}.xlsx`,
      base64: Buffer.from(buffer as ArrayBuffer).toString("base64"),
    };
  });
}
