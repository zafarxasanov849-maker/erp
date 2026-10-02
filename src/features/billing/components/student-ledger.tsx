"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Printer, Receipt } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { SCALE } from "@/lib/billing/calc";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { voidPayment } from "../actions";
import type { LedgerRow } from "../queries";
import { type VoidValues, voidSchema } from "../schema";

/** Balans va eski qarz — ro'yxat va profilda bir xil ko'rinish (manfiy — qizil, "−") */
export function MoneyAmount({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        value < 0 && "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {formatMoney(value)}
    </span>
  );
}

export function StudentLedger({
  rows,
  balance,
  oldDebt,
  debtSince,
  canVoid,
  branchPath,
}: {
  rows: LedgerRow[];
  balance: number;
  oldDebt: number;
  debtSince: string | null;
  canVoid: boolean;
  branchPath: string;
}) {
  const t = useTranslations("billing");
  const tm = useTranslations("months");
  const [voiding, setVoiding] = useState<LedgerRow | null>(null);
  // Brauzerlarda o'zbekcha oy nomlari yo'q — tarjimadan
  const monthLabel = (month: string) =>
    `${tm(String(Number(month.slice(5, 7))) as "1")} ${month.slice(0, 4)}`;
  const voidedRefs = new Set(rows.filter((r) => r.kind === "void").map((r) => r.paymentRef));

  const describe = (r: LedgerRow): string => {
    if (r.kind === "payment" || r.kind === "void" || r.kind === "refund") {
      return [r.groupName, r.methodName, r.note].filter(Boolean).join(" · ");
    }
    const b = r.billing;
    if (!b) return r.note ?? "";
    const charged = b.lessons.filter((l) => l.p > 0).length;
    const refunded = b.lessons.filter((l) => l.p < 0).length;
    const discounted = b.lessons.some((l) => l.p > 0 && l.p < b.basis.base * SCALE);
    // Chegirmada dars qaytarilmaydi — faqat narxi qayta hisoblanadi
    const whole = b.reason !== "discount";
    const parts = [
      r.groupName,
      monthLabel(b.month),
      r.kind === "charge"
        ? t("ledger.lessons", { count: charged, full: b.basis.full })
        : !whole
          ? t("ledger.lessonsRecalc", { count: b.lessons.length })
          : refunded > 0 && charged === 0
            ? t("ledger.lessonsRefund", { count: refunded })
            : t("ledger.lessonsCharge", { count: charged }),
      discounted ? t("ledger.withDiscount") : null,
    ];
    return parts.filter(Boolean).join(" · ");
  };

  const title = (r: LedgerRow) =>
    r.kind === "adjustment" && r.billing?.reason
      ? t(`reasons.${r.billing.reason}`)
      : r.kind === "charge" && r.billing?.reason === "activation"
        ? `${t("kinds.charge")} · ${t("reasons.activation")}`
        : t(`kinds.${r.kind}`);

  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:max-w-md" data-testid="balance-summary">
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">{t("ledger.balance")}</dt>
          <dd className="text-lg font-semibold" data-testid="balance">
            <MoneyAmount value={balance} />
          </dd>
        </div>
        <div className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">{t("ledger.oldDebt")}</dt>
          <dd className="text-lg font-semibold" data-testid="old-debt">
            <MoneyAmount value={oldDebt} />
          </dd>
        </div>
        {debtSince && (
          <p className="col-span-2 text-sm text-red-600 dark:text-red-400">
            {t("ledger.debtSince", { date: formatDate(debtSince) })}
          </p>
        )}
      </dl>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("ledger.emptyTitle")}
          description={t("ledger.emptyDescription")}
        />
      ) : (
        <ul className="divide-y rounded-lg border" data-testid="ledger">
          {rows.map((r) => {
            const voided = r.kind === "payment" && voidedRefs.has(r.paymentRef);
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-3 py-2"
                data-kind={r.kind}
              >
                <div className="grid min-w-0 gap-0.5">
                  <span className={cn("text-sm font-medium", voided && "line-through opacity-60")}>
                    {title(r)}
                    {r.receiptNo && r.kind === "payment" && (
                      <Link
                        href={`${branchPath}/payments/${r.paymentRef}`}
                        target="_blank"
                        className="ml-2 text-xs font-normal text-muted-foreground hover:underline"
                      >
                        <Printer className="mr-0.5 inline size-3" />
                        {t("ledger.receiptNo", { no: r.receiptNo })}
                      </Link>
                    )}
                    {voided && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground no-underline">
                        {t("void.voided")}
                      </span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatDate(r.occurredOn)}
                    {describe(r) && ` · ${describe(r)}`}
                    {r.createdByName && ` · ${r.createdByName}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      r.amount > 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                      voided && "line-through opacity-60",
                    )}
                    data-testid="ledger-amount"
                  >
                    {formatMoney(r.amount, { signed: true })}
                  </span>
                  {canVoid && r.kind === "payment" && !voided && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={t("void.title")}
                      title={t("void.title")}
                      onClick={() => setVoiding(r)}
                    >
                      <Ban />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {voiding?.paymentRef && (
        <VoidDialog
          paymentRef={voiding.paymentRef}
          amount={voiding.amount}
          onClose={() => setVoiding(null)}
        />
      )}
    </div>
  );
}

function VoidDialog({
  paymentRef,
  amount,
  onClose,
}: {
  paymentRef: string;
  amount: number;
  onClose: () => void;
}) {
  const t = useTranslations("billing.void");
  const tc = useTranslations("common");
  const form = useForm<VoidValues>({
    resolver: zodResolver(voidSchema),
    defaultValues: { paymentRef, reason: "" },
  });
  const { error, pending, run } = useServerAction(form);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>
            {t("title")}: {formatMoney(amount)}
          </DialogTitle>
          <DialogDescription>{t("hint")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => voidPayment(v),
                () => {
                  toast.success(t("done"));
                  onClose();
                },
              ),
            )}
          >
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("reason")}</FormLabel>
                  <FormControl>
                    <Input autoFocus placeholder={t("reasonPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError error={error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {tc("cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
