import { Banknote, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentsFilters } from "@/features/billing/components/payments-filters";
import { loadPaymentsSearchParams } from "@/features/billing/payments-search-params";
import { getPaymentMethods, listPayments } from "@/features/billing/queries";
import { ReportToolbar } from "@/features/reports/components/report-toolbar";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { requirePagePermission } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { resolveReportPeriod } from "@/lib/metrics/period";
import { summarizePayments } from "@/lib/metrics/payments";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing.payments");
  return { title: t("title") };
}

/** Moliya → Tushumlar: davr, filial (yuqoridagi tanlagich), to'lov turi, xodim; jami tur bo'yicha. */
export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("payments.view");
  const t = await getTranslations("billing.payments");
  const sp = loadPaymentsSearchParams(await searchParams);
  const period = resolveReportPeriod(sp.period, todayInTashkent(), { from: sp.from, to: sp.to });
  const branch = branchId === ALL_BRANCHES ? null : branchId;
  const [{ payments: all, truncated }, activeMethods] = await Promise.all([
    listPayments(ctx.membership.orgId, branch, period.from, period.to),
    getPaymentMethods(ctx.membership.orgId),
  ]);

  const methods = new Map(activeMethods.map((m) => [m.id, m.name]));
  const staff = new Map<string, string>();
  for (const p of all) {
    if (p.methodId && !methods.has(p.methodId)) methods.set(p.methodId, p.methodName);
    if (p.staffId) staff.set(p.staffId, p.staffName ?? "—");
  }
  const payments = all.filter(
    (p) => (!sp.method || p.methodId === sp.method) && (!sp.staff || p.staffId === sp.staff),
  );
  const summary = summarizePayments(payments);
  const branchNames = new Map(ctx.branches.map((b) => [b.id, b.name]));
  const base = `/${branchId}`;

  return (
    <div className="space-y-4">
      <ReportToolbar kind={null} branchId={branchId} period={period} canExport={false} />
      <PaymentsFilters
        methods={[...methods].map(([id, name]) => ({ id, name }))}
        staff={[...staff].map(([id, name]) => ({ id, name }))}
      />

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="payments-summary"
      >
        <div className="rounded-xl border p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {t("total")}
            <Banknote className="size-4" aria-hidden />
          </div>
          <div className="text-2xl font-semibold tabular-nums" data-testid="payments-total">
            {formatMoney(summary.total)}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("count", { count: summary.count })}
            {summary.voidedCount > 0 && ` · ${t("voidedCount", { count: summary.voidedCount })}`}
          </div>
        </div>
        {summary.byMethod.map((m) => (
          <div key={m.method} className="rounded-xl border p-4">
            <div className="truncate text-sm text-muted-foreground">{m.method || "—"}</div>
            <div className="text-xl font-semibold whitespace-nowrap tabular-nums">
              {formatMoney(m.amount)}
            </div>
            <div className="text-xs text-muted-foreground">{t("count", { count: m.count })}</div>
          </div>
        ))}
      </div>

      {truncated && <p className="text-sm text-amber-700 dark:text-amber-400">{t("truncated")}</p>}

      {payments.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="payments-list">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("receipt")}</TableHead>
                <TableHead>{t("student")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("method")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("staff")}</TableHead>
                {branch === null && (
                  <TableHead className="hidden lg:table-cell">{t("branch")}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.ref} className={cn(p.voided && "text-muted-foreground")}>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatDate(p.paidOn)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={`${base}/payments/${p.ref}`}
                      className="tabular-nums hover:underline"
                    >
                      № {p.receiptNo ?? "—"}
                    </Link>
                    {p.voided && (
                      <Badge variant="outline" className="ml-2">
                        {t("voided")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.student ? (
                      <Link
                        href={`${base}/students/${p.student.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.student.fullName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right whitespace-nowrap tabular-nums",
                      p.voided && "line-through",
                    )}
                  >
                    {formatMoney(p.amount)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{p.methodName || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.staffName ?? "—"}</TableCell>
                  {branch === null && (
                    <TableCell className="hidden lg:table-cell">
                      {branchNames.get(p.branchId) ?? "—"}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
