"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Percent, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import {
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
import { useTranslateKey } from "@/i18n/use-translate-key";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { addDiscount, removeDiscount } from "../actions";
import { type DiscountValues, discountSchema } from "../schema";

export interface DiscountChip {
  id: string;
  percent: number | null;
  amount: number | null;
  from: string;
  to: string | null;
  reason: string | null;
}

export function discountLabel(d: { percent: number | null; amount: number | null }): string {
  return d.percent !== null
    ? `${String(d.percent).replace(".", ",")}%`
    : formatMoney(d.amount ?? 0);
}

/** A'zolik kartasida chegirmalar ro'yxati */
export function DiscountChips({
  discounts,
  removable,
}: {
  discounts: readonly DiscountChip[];
  removable: boolean;
}) {
  const t = useTranslations("billing.discount");
  const tk = useTranslateKey();
  const { pending, run } = useServerAction();
  if (discounts.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" data-testid="discounts">
      {discounts.map((d) => (
        <li
          key={d.id}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-0.5 pr-1 pl-2 text-xs text-emerald-800 dark:text-emerald-300"
          title={d.reason ?? undefined}
        >
          <Percent className="size-3" />
          {t("label", { value: discountLabel(d) })} ·{" "}
          {d.to
            ? t("range", { from: formatDate(d.from), to: formatDate(d.to) })
            : t("since", { from: formatDate(d.from) })}
          {removable && (
            <button
              type="button"
              className={cn("rounded-full p-0.5 hover:bg-emerald-500/20", pending && "opacity-50")}
              aria-label={t("remove")}
              disabled={pending}
              onClick={() => {
                if (!window.confirm(t("removeConfirm"))) return;
                run(async () => {
                  const r = await removeDiscount(d.id);
                  if (!r.ok) toast.error(tk(r.error));
                  return undefined;
                });
              }}
            >
              <X className="size-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Dialog ichidagi forma (Dialog'ning o'zi chaqiruvchida) */
export function DiscountDialogContent({
  enrollmentId,
  title,
  today,
  onDone,
}: {
  enrollmentId: string;
  title: string;
  /** KK.OO.YYYY */
  today: string;
  onDone: () => void;
}) {
  const t = useTranslations("billing.discount");
  const tc = useTranslations("common");
  const form = useForm<DiscountValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      enrollmentId,
      type: "percent",
      value: undefined as unknown as number,
      from: today,
      to: "",
      reason: "",
    },
  });
  const { error, pending, run } = useServerAction(form);
  const type = useWatch({ control: form.control, name: "type" });

  return (
    <DialogContent closeLabel={tc("close")}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{t("hint")}</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((v) =>
            run(
              () => addDiscount(v),
              () => {
                toast.success(t("saved"));
                onDone();
              },
            ),
          )}
        >
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("type")}</FormLabel>
                <div
                  className="grid grid-cols-2 rounded-md border p-0.5"
                  role="radiogroup"
                  aria-label={t("type")}
                >
                  {(["percent", "amount"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={field.value === k}
                      className={cn(
                        "rounded px-2 py-1 text-sm",
                        field.value === k
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent",
                      )}
                      onClick={() => {
                        field.onChange(k);
                        form.setValue("value", undefined as unknown as number);
                      }}
                    >
                      {t(k)}
                    </button>
                  ))}
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("value")}</FormLabel>
                {type === "percent" ? (
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={100}
                        className="w-32"
                        value={Number.isFinite(field.value) ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                ) : (
                  <FormControl>
                    <MoneyInput
                      value={Number.isFinite(field.value) ? field.value : null}
                      onChange={(v) => field.onChange(v ?? undefined)}
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("from")}</FormLabel>
                  <FormControl>
                    <DateInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("to")}</FormLabel>
                  <FormControl>
                    <DateInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("reason")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormError error={error} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
