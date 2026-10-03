import { Calculator } from "lucide-react";
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
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { SalaryLine, SalaryRule, SalarySummary } from "@/lib/payroll/calc";

/** Oy yakuni kartochkalari va "qanday hisoblandi" jadvali (Ish haqi va Mening oyligim) */
export async function SalaryBreakdown({
  lines,
  summary,
  rules,
}: {
  lines: SalaryLine[];
  summary: SalarySummary;
  rules: SalaryRule[];
}) {
  const t = await getTranslations("salary");
  const tt = await getTranslations("salary.types");
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const pct = (v: number) => `${String(v).replace(".", ",")}%`;

  function explain(l: SalaryLine): string {
    const r = ruleById.get(l.ruleId);
    switch (l.type) {
      case "fixed_monthly":
        return t("explain.fixedMonthly", {
          amount: formatMoney(r?.amount ?? 0),
          from: formatDate(l.from),
          to: formatDate(l.to),
        });
      case "fixed_per_group":
        return l.base > 0
          ? t("explain.perGroupHeld", { count: l.base })
          : t("explain.perGroupNone");
      case "percent_of_revenue":
        return t("explain.percent", {
          revenue: formatMoney(l.base),
          percent: pct(r?.percent ?? 0),
        });
      case "per_lesson":
        return t("explain.perLesson", { count: l.base, amount: formatMoney(r?.amount ?? 0) });
    }
  }

  const cards: [string, number, string][] = [
    [
      summary.override !== null ? t("summary.override") : t("summary.calculated"),
      summary.accrued,
      "accrued",
    ],
    [t("summary.bonus"), summary.bonus, "bonus"],
    [t("summary.penalty"), summary.penalty, "penalty"],
    [t("summary.paid"), summary.paid, "paid"],
    [summary.due < 0 ? t("summary.overpaid") : t("summary.due"), summary.due, "due"],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="salary-summary">
        {cards.map(([label, value, key]) => (
          <div key={key} className="rounded-xl border p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div
              className="text-lg font-semibold whitespace-nowrap tabular-nums sm:text-xl"
              data-testid={`salary-${key}`}
            >
              <MoneyAmount value={key === "penalty" ? -value : value} />
            </div>
            {key === "accrued" && summary.override !== null && (
              <div className="text-xs text-muted-foreground">
                {t("summary.calculatedWas", { amount: formatMoney(summary.calculated) })}
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="space-y-2" aria-labelledby="salary-lines">
        <h2 id="salary-lines" className="font-semibold">
          {t("howCalculated")}
        </h2>
        {lines.length === 0 ? (
          <EmptyState
            icon={Calculator}
            title={t("noRulesTitle")}
            description={t("noRulesDescription")}
            className="py-8"
          />
        ) : (
          <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="salary-lines">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("rule")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("basis")}</TableHead>
                  <TableHead className="text-right">{t("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, i) => (
                  <TableRow key={`${l.ruleId}-${l.groupId ?? i}`}>
                    <TableCell>
                      <div className="font-medium">{tt(l.type)}</div>
                      {l.groupName && (
                        <div className="text-xs text-muted-foreground">{l.groupName}</div>
                      )}
                      <div className="text-xs text-muted-foreground sm:hidden">{explain(l)}</div>
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">{explain(l)}</TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                      {formatMoney(l.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>{t("summary.calculated")}</TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {formatMoney(summary.calculated)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
