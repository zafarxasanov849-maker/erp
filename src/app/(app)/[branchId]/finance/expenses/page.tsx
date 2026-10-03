import { Receipt, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createLoader, createParser, parseAsStringLiteral } from "nuqs/server";

import { EmptyState } from "@/components/empty-state";
import { FilterSelects } from "@/components/filter-selects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddExpenseButton } from "@/features/expenses/components/expense-dialog";
import { ExpenseRowActions } from "@/features/expenses/components/expense-row-actions";
import {
  getExpenseCategories,
  getMethodsWithHand,
  listExpenses,
} from "@/features/expenses/queries";
import { reportSearchParams } from "@/features/reports/search-params";
import { ReportToolbar } from "@/features/reports/components/report-toolbar";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { can, requirePagePermission } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { resolveReportPeriod } from "@/lib/metrics/period";
import { formatMoney } from "@/lib/money";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("expenses");
  return { title: t("title") };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const parseAsUuid = createParser({
  parse: (v) => (UUID.test(v) ? v : null),
  serialize: (v: string) => v,
});
const loadParams = createLoader({
  ...reportSearchParams,
  category: parseAsUuid,
  method: parseAsUuid,
  trash: parseAsStringLiteral(["1"] as const),
});

/** Moliya → Xarajatlar (PRD §3.6, A–C). O'chirilganlar — savatda. */
export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("expenses.view");
  const t = await getTranslations("expenses");
  const tk = await getTranslations("expenses.kinds");
  const sp = loadParams(await searchParams);
  const period = resolveReportPeriod(sp.period, todayInTashkent(), { from: sp.from, to: sp.to });
  const branch = branchId === ALL_BRANCHES ? null : branchId;
  const trash = sp.trash === "1";
  const orgId = ctx.membership.orgId;
  const [all, categories, methods] = await Promise.all([
    listExpenses(orgId, branch, period.from, period.to, trash),
    getExpenseCategories(orgId),
    getMethodsWithHand(orgId),
  ]);
  const rows = all.filter(
    (e) =>
      (!sp.category || e.categoryId === sp.category) && (!sp.method || e.methodId === sp.method),
  );
  const total = rows.reduce((s, e) => s + e.amount, 0);
  const byCategory = [
    ...rows
      .reduce(
        (m, e) => m.set(e.categoryName, (m.get(e.categoryName) ?? 0) + e.amount),
        new Map<string, number>(),
      )
      .entries(),
  ].sort((a, b) => b[1] - a[1]);
  const branchNames = new Map(ctx.branches.map((b) => [b.id, b.name]));
  const base = `/${branchId}/finance/expenses`;
  const options = {
    categories: categories.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name })),
    methods: methods
      .filter((m) => m.isActive && !m.isParent)
      .map((m) => ({ id: m.id, name: m.name, inHand: m.inHand })),
    branches: ctx.branches,
    defaultBranchId: branch ?? ctx.branches[0]?.id ?? "",
  };
  const canUpdate = can(ctx, "expenses.update");
  const canDelete = can(ctx, "expenses.delete");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ReportToolbar kind={null} branchId={branchId} period={period} canExport={false} />
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={trash ? base : `${base}?trash=1`}>
              <Trash2 />
              {trash ? t("backToList") : t("trash")}
            </Link>
          </Button>
          {!trash && can(ctx, "expenses.create") && (
            <AddExpenseButton options={options} label={t("add")} />
          )}
        </div>
      </div>
      <FilterSelects
        filters={[
          {
            key: "category",
            label: t("category"),
            anyLabel: t("allCategories"),
            items: categories.map((c) => ({ id: c.id, name: c.name })),
          },
          {
            key: "method",
            label: t("method"),
            anyLabel: t("allMethods"),
            items: methods.filter((m) => !m.isParent).map((m) => ({ id: m.id, name: m.name })),
          },
        ]}
      />

      {trash && <p className="text-sm text-muted-foreground">{t("trashHint")}</p>}

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="expenses-summary"
      >
        <div className="rounded-xl border p-4">
          <div className="text-sm text-muted-foreground">
            {trash ? t("trashTotal") : t("total")}
          </div>
          <div
            className="text-2xl font-semibold whitespace-nowrap tabular-nums"
            data-testid="expenses-total"
          >
            {formatMoney(total)}
          </div>
          <div className="text-xs text-muted-foreground">{t("count", { count: rows.length })}</div>
        </div>
        {byCategory.slice(0, 3).map(([name, amount]) => (
          <div key={name} className="rounded-xl border p-4">
            <div className="truncate text-sm text-muted-foreground">{name}</div>
            <div className="text-xl font-semibold whitespace-nowrap tabular-nums">
              {formatMoney(amount)}
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={trash ? Trash2 : Receipt}
          title={trash ? t("trashEmptyTitle") : t("emptyTitle")}
          description={trash ? t("trashEmptyDescription") : t("emptyDescription")}
        />
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="expenses-list">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">{t("date")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("method")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("source")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("recipient")}</TableHead>
                {branch === null && (
                  <TableHead className="hidden xl:table-cell">{t("branch")}</TableHead>
                )}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id} data-expense={e.recipient ?? e.categoryName}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDate(e.paidAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{e.categoryName}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="tabular-nums sm:hidden">{formatDate(e.paidAt)} · </span>
                      {tk(e.kind)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                    {formatMoney(e.amount)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{e.methodName || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {e.fromKassa ? t("kassa") : (e.holderName ?? "—")}
                  </TableCell>
                  <TableCell className="hidden max-w-64 lg:table-cell">
                    <div className="truncate">{e.recipient ?? "—"}</div>
                    {(e.note || (trash && e.deleteReason)) && (
                      <div className="truncate text-xs text-muted-foreground">
                        {trash && e.deleteReason ? e.deleteReason : e.note}
                      </div>
                    )}
                  </TableCell>
                  {branch === null && (
                    <TableCell className="hidden xl:table-cell">
                      {branchNames.get(e.branchId) ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    {e.salaryLinked ? (
                      <Badge variant="outline" title={t("salaryLinkedHint")}>
                        {t("salaryLinked")}
                      </Badge>
                    ) : (
                      <ExpenseRowActions
                        row={e}
                        options={options}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        trash={trash}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
