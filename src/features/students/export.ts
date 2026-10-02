"use server";

import ExcelJS from "exceljs";
import { getTranslations } from "next-intl/server";

import { ALL_BRANCHES } from "@/features/shell/nav";
import { ActionError, type ActionResult, runAction } from "@/lib/action";
import { can, requirePermission } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";

import { listStudentsForExport } from "./queries";
import { type StudentListFilters, loadStudentSearchParams } from "./search-params";

/**
 * Talabalar ro'yxatini joriy filtrlar bilan Excel (.xlsx) ga eksport.
 * Filtrlar URL query satri ko'rinishida keladi va server tomonda qayta tekshiriladi.
 */
export async function exportStudents(
  branchId: string,
  query: string,
): Promise<ActionResult<{ fileName: string; base64: string }>> {
  return runAction(async () => {
    const ctx = await requirePermission("students.export");
    const allowed =
      branchId === ALL_BRANCHES
        ? ctx.membership.allBranches
        : ctx.branches.some((b) => b.id === branchId);
    if (!allowed) throw new ActionError("errors.forbidden");

    const { page: _page, ...filters } = loadStudentSearchParams(new URLSearchParams(query));
    void _page;
    const rows = await listStudentsForExport(
      ctx.membership.orgId,
      branchId === ALL_BRANCHES ? null : branchId,
      filters satisfies StudentListFilters,
    );

    const t = await getTranslations("students");
    const branchNames = new Map(ctx.branches.map((b) => [b.id, b.name]));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(t("title"));
    ws.columns = [
      { header: t("list.name"), key: "name", width: 32 },
      { header: t("list.phone"), key: "phone", width: 20 },
      { header: t("list.parentPhone"), key: "parentPhone", width: 20 },
      { header: t("list.branch"), key: "branch", width: 18 },
      { header: t("list.groups"), key: "groups", width: 40 },
      { header: t("list.status"), key: "status", width: 14 },
      { header: t("list.tags"), key: "tags", width: 24 },
      { header: t("list.joinedAt"), key: "joinedAt", width: 14 },
      ...(can(ctx, "payments.view")
        ? [
            { header: t("list.balance"), key: "balance", width: 14, style: { numFmt: "# ##0" } },
            { header: t("list.oldDebt"), key: "oldDebt", width: 14, style: { numFmt: "# ##0" } },
          ]
        : []),
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const r of rows) {
      ws.addRow({
        name: r.fullName,
        phone: formatPhone(r.phone),
        parentPhone: r.parentPhone ? formatPhone(r.parentPhone) : "",
        branch: branchNames.get(r.branchId) ?? "",
        groups: r.groups
          .map((g) => `${g.name} (${t(`enrollmentStatuses.${g.status}`)})`)
          .join(", "),
        status: t(`statuses.${r.status}`),
        tags: r.tags.map((x) => x.name).join(", "),
        joinedAt: formatDate(r.joinedAt),
        balance: r.balance,
        oldDebt: r.oldDebt,
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    return {
      fileName: `${t("list.exportFile")}-${formatDate(todayInTashkent())}.xlsx`,
      base64: Buffer.from(buffer as ArrayBuffer).toString("base64"),
    };
  });
}
