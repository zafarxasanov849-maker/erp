import { Calculator } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { MonthNav } from "@/features/salary/components/month-nav";
import { StaffJump } from "@/features/salary/components/staff-jump";
import { buildPayroll, parseMonth } from "@/features/salary/queries";
import { listStaff } from "@/features/staff/queries";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("salary");
  return { title: t("title") };
}

/** Moliya → Ish haqi: oy bo'yicha hisoblangan / bonus−jarima / berilgan / qoldiq (K) */
export default async function SalaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("salary.view");
  const t = await getTranslations("salary");
  const tt = await getTranslations("salary.types");
  const month = parseMonth((await searchParams).month);
  const orgId = ctx.membership.orgId;
  const [rows, staff] = await Promise.all([buildPayroll(orgId, month), listStaff(orgId)]);
  const byId = new Map(staff.map((s) => [s.id, s]));
  const sorted = [...rows].sort((a, b) =>
    (byId.get(a.staffId)?.fullName ?? "").localeCompare(byId.get(b.staffId)?.fullName ?? ""),
  );
  const base = `/${branchId}/finance/salary`;
  const sum = (k: "accrued" | "bonus" | "penalty" | "paid" | "due") =>
    rows.reduce((s, r) => s + r[k], 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav month={month} basePath={base} />
        <StaffJump
          staff={staff.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.fullName }))}
          basePath={base}
          month={month}
        />
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon={Calculator} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="payroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("staff")}</TableHead>
                <TableHead className="text-right">{t("summary.calculated")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("summary.bonusPenalty")}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("summary.paid")}
                </TableHead>
                <TableHead className="text-right">{t("summary.due")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => {
                const s = byId.get(r.staffId);
                return (
                  <TableRow key={r.staffId} data-staff={s?.fullName}>
                    <TableCell>
                      <Link
                        href={`${base}/${r.staffId}?month=${month}`}
                        className="font-medium hover:underline"
                      >
                        {s?.fullName ?? "—"}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {[s?.roleName, ...r.types.map((x) => tt(x))].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-right whitespace-nowrap tabular-nums"
                      data-testid="payroll-accrued"
                    >
                      <MoneyAmount value={r.accrued} />
                      {r.override !== null && (
                        <div className="text-xs text-muted-foreground">{t("overridden")}</div>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <MoneyAmount value={r.bonus - r.penalty} />
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <MoneyAmount value={r.paid} />
                    </TableCell>
                    <TableCell className="text-right font-medium" data-testid="payroll-due">
                      <MoneyAmount value={r.due} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>{t("total")}</TableCell>
                <TableCell className="text-right">
                  <MoneyAmount value={sum("accrued")} />
                </TableCell>
                <TableCell className="hidden text-right sm:table-cell">
                  <MoneyAmount value={sum("bonus") - sum("penalty")} />
                </TableCell>
                <TableCell className="hidden text-right sm:table-cell">
                  <MoneyAmount value={sum("paid")} />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyAmount value={sum("due")} />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}
