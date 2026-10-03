import { ArrowRightLeft, Wallet } from "lucide-react";
import type { Metadata } from "next";
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
import { MoneyAmount } from "@/features/billing/components/student-ledger";
import { HandoverButton, VoidHandoverButton } from "@/features/cash/components/handover-dialog";
import { getCashPositions, listHandovers } from "@/features/cash/queries";
import { getMethodsWithHand } from "@/features/expenses/queries";
import { loadReportPeriod } from "@/features/reports/search-params";
import { ReportToolbar } from "@/features/reports/components/report-toolbar";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { listStaff } from "@/features/staff/queries";
import { can, requirePagePermission } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cash");
  return { title: t("title") };
}

/** Moliya → Kassa ("Qo'limdagi pul", E–G): har xodim va filial kassasi bo'yicha. */
export default async function CashPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission(["cash.view", "cash.handover"]);
  const t = await getTranslations("cash");
  const period = await loadReportPeriod(searchParams, todayInTashkent());
  const branch = branchId === ALL_BRANCHES ? null : branchId;
  const orgId = ctx.membership.orgId;
  const me = ctx.membership.staffId;
  const [positions, handovers, methods, staff] = await Promise.all([
    getCashPositions(orgId, branch, period.from, period.to),
    listHandovers(orgId, branch, period.from, period.to),
    getMethodsWithHand(orgId),
    listStaff(orgId),
  ]);
  const methodName = new Map(methods.map((m) => [m.id, m.name]));
  const staffName = new Map(staff.map((s) => [s.id, s.fullName]));
  const branchName = new Map(ctx.branches.map((b) => [b.id, b.name]));
  const holderName = (staffId: string | null, kassa: string | null) =>
    staffId
      ? (staffName.get(staffId) ?? "—")
      : t("kassaOf", { branch: branchName.get(kassa ?? "") ?? "—" });

  const visible = positions.filter(
    (p) => p.opening || p.received || p.spent || p.handedOut || p.handedIn || p.closing,
  );
  const sorted = [...visible].sort((a, b) => {
    const rank = (p: typeof a) => (p.staffId === me ? 0 : p.staffId ? 1 : 2);
    return (
      rank(a) - rank(b) ||
      holderName(a.staffId, a.kassaBranchId).localeCompare(
        holderName(b.staffId, b.kassaBranchId),
      ) ||
      (methodName.get(a.methodId) ?? "").localeCompare(methodName.get(b.methodId) ?? "")
    );
  });
  const mine = positions.filter((p) => p.staffId === me);
  const myBalance = Object.fromEntries(mine.map((p) => [p.methodId, p.closing]));
  const canHandover = can(ctx, "cash.handover");
  const canVoid = can(ctx, "cash.view");
  const inHandMethods = methods.filter((m) => m.inHand && !m.isParent && m.isActive);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ReportToolbar kind={null} branchId={branchId} period={period} canExport={false} />
        {canHandover && (
          <HandoverButton
            options={{
              targets: staff
                .filter((s) => s.isActive && s.id !== me)
                .map((s) => ({ id: s.id, name: s.fullName })),
              methods: inHandMethods.map((m) => ({ id: m.id, name: m.name })),
              branches: ctx.branches,
              defaultBranchId: branch ?? ctx.branches[0]?.id ?? "",
              myBalance,
            }}
          />
        )}
      </div>

      <section aria-labelledby="my-cash" className="space-y-2">
        <h2 id="my-cash" className="font-semibold">
          {t("mine")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="my-cash">
          {mine.filter((p) => p.closing !== 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("mineEmpty")}</p>
          ) : (
            mine
              .filter((p) => p.closing !== 0)
              .map((p) => (
                <div key={p.methodId} className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">{methodName.get(p.methodId)}</div>
                  <div
                    className="text-2xl font-semibold whitespace-nowrap tabular-nums"
                    data-testid={`my-cash-${methodName.get(p.methodId)}`}
                  >
                    {formatMoney(p.closing)}
                  </div>
                </div>
              ))
          )}
        </div>
      </section>

      <section aria-labelledby="cash-positions" className="space-y-2">
        <div>
          <h2 id="cash-positions" className="font-semibold">
            {t("positions")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("positionsHint")}</p>
        </div>
        {sorted.length === 0 ? (
          <EmptyState icon={Wallet} title={t("emptyTitle")} description={t("emptyDescription")} />
        ) : (
          <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="cash-positions">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("holder")}</TableHead>
                  <TableHead>{t("method")}</TableHead>
                  <TableHead className="hidden text-right md:table-cell">{t("opening")}</TableHead>
                  <TableHead className="hidden text-right md:table-cell">{t("received")}</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">{t("spent")}</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    {t("handedOut")}
                  </TableHead>
                  <TableHead className="hidden text-right lg:table-cell">{t("handedIn")}</TableHead>
                  <TableHead className="text-right">{t("closing")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => (
                  <TableRow
                    key={`${p.staffId ?? p.kassaBranchId}-${p.methodId}`}
                    className={cn(p.staffId === me && "bg-accent/40")}
                    data-holder={holderName(p.staffId, p.kassaBranchId)}
                  >
                    <TableCell className="font-medium">
                      {holderName(p.staffId, p.kassaBranchId)}
                      {p.staffId === me && (
                        <Badge variant="outline" className="ml-2">
                          {t("you")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{methodName.get(p.methodId) ?? "—"}</TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      <MoneyAmount value={p.opening} />
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      <MoneyAmount value={p.received} />
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      <MoneyAmount value={p.spent} />
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      <MoneyAmount value={p.handedOut} />
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">
                      <MoneyAmount value={p.handedIn} />
                    </TableCell>
                    <TableCell className="text-right font-medium" data-testid="cash-closing">
                      <MoneyAmount value={p.closing} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section aria-labelledby="cash-history" className="space-y-2">
        <h2 id="cash-history" className="font-semibold">
          {t("history.title")}
        </h2>
        {handovers.length === 0 ? (
          <EmptyState
            icon={ArrowRightLeft}
            title={t("history.emptyTitle")}
            description={t("history.emptyDescription")}
            className="py-8"
          />
        ) : (
          <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="cash-history">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("history.date")}</TableHead>
                  <TableHead>{t("history.route")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("method")}</TableHead>
                  <TableHead className="text-right">{t("history.amount")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("history.note")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {handovers.map((h) => (
                  <TableRow key={h.id} className={cn(h.voided && "text-muted-foreground")}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatDate(h.handedOn)}
                    </TableCell>
                    <TableCell>
                      {staffName.get(h.fromStaffId) ?? "—"} →{" "}
                      {h.toStaffId
                        ? (staffName.get(h.toStaffId) ?? "—")
                        : t("kassaOf", { branch: branchName.get(h.branchId) ?? "—" })}
                      {h.voided && (
                        <Badge variant="outline" className="ml-2">
                          {t("history.voidedBadge")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {methodName.get(h.methodId) ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right whitespace-nowrap tabular-nums",
                        h.voided && "line-through",
                      )}
                    >
                      {formatMoney(h.amount)}
                    </TableCell>
                    <TableCell className="hidden max-w-64 truncate md:table-cell">
                      {h.voided ? h.voidReason : (h.note ?? "—")}
                    </TableCell>
                    <TableCell>
                      {canVoid && !h.voided && <VoidHandoverButton id={h.id} amount={h.amount} />}
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
