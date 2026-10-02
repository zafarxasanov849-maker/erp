import { HandCoins, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyAmount } from "@/features/billing/components/student-ledger";
import { getDebtors } from "@/features/billing/queries";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { requirePagePermission } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("finance") };
}

/** Moliya: hozircha Qarzdorlar (PRD §3.6). Tushumlar, xarajatlar, kassa — 7-bosqich. */
export default async function FinancePage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("payments.view");
  const t = await getTranslations("billing");
  const debtors = await getDebtors(
    ctx.membership.orgId,
    branchId === ALL_BRANCHES ? null : branchId,
    todayInTashkent(),
  );
  const total = debtors.reduce((s, d) => s + d.balance, 0);
  const base = `/${branchId}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("finance.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("finance.soon")}</p>
      </div>

      <section className="space-y-3" aria-labelledby="debtors-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="debtors-title" className="text-lg font-semibold">
              {t("debtors.title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("debtors.hint")}</p>
          </div>
          {debtors.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium" data-testid="debtors-total">
                {t("debtors.total", { amount: formatMoney(total), count: debtors.length })}
              </span>
              <Button variant="outline" size="sm" disabled title={t("debtors.remindSoon")}>
                <MessageSquare />
                {t("debtors.remind")}
              </Button>
            </div>
          )}
        </div>

        {debtors.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={t("debtors.emptyTitle")}
            description={t("debtors.emptyDescription")}
          />
        ) : (
          <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="debtors">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("debtors.student")}</TableHead>
                  <TableHead>{t("debtors.groups")}</TableHead>
                  <TableHead className="text-right">{t("debtors.debt")}</TableHead>
                  <TableHead className="text-right">{t("debtors.oldDebt")}</TableHead>
                  <TableHead>{t("debtors.since")}</TableHead>
                  <TableHead>{t("debtors.lastPayment")}</TableHead>
                  <TableHead>{t("debtors.parentPhone")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtors.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`${base}/students/${d.id}`}
                        className="font-medium hover:underline"
                      >
                        {d.fullName}
                      </Link>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {formatPhone(d.phone)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{d.groups.join(", ")}</TableCell>
                    <TableCell className="text-right">
                      <MoneyAmount value={d.balance} className="font-medium" />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyAmount value={d.oldDebt} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {d.days !== null ? t("debtors.days", { count: d.days }) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {d.lastPayment ? formatDate(d.lastPayment) : t("debtors.never")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {d.parentPhone ? (
                        <a href={`tel:${d.parentPhone}`} className="hover:underline">
                          {formatPhone(d.parentPhone)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
