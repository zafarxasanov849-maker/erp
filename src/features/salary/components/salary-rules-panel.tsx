"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { useTranslateKey } from "@/i18n/use-translate-key";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { SalaryRule } from "@/lib/payroll/calc";

import { deleteSalaryRule, saveSalaryRule } from "../actions";
import { SALARY_TYPES, type SalaryRuleValues, salaryRuleSchema } from "../schema";

const ALL = "__all";

/** Xodim kelishuvlari: qo'shish, tahrirlash (tugatish sanasi), o'chirish */
export function SalaryRulesPanel({
  staffId,
  rules,
  groups,
  canManage,
}: {
  staffId: string;
  rules: SalaryRule[];
  groups: { id: string; name: string }[];
  canManage: boolean;
}) {
  const t = useTranslations("salary.rules");
  const tt = useTranslations("salary.types");
  const tk = useTranslateKey();
  const router = useRouter();
  const [editing, setEditing] = useState<SalaryRuleValues | null>(null);
  const [pending, start] = useTransition();
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const today = todayInTashkent();

  const value = (r: SalaryRule) =>
    r.type === "percent_of_revenue"
      ? `${String(r.percent ?? 0).replace(".", ",")}%`
      : formatMoney(r.amount ?? 0);

  return (
    <section className="space-y-2" aria-labelledby="salary-rules">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="salary-rules" className="font-semibold">
            {t("title")}
          </h2>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setEditing({
                id: "",
                staffId,
                type: "percent_of_revenue",
                amount: undefined,
                percent: undefined,
                groupId: "",
                validFrom: formatDate(`${today.slice(0, 7)}-01`),
                validTo: "",
              })
            }
          >
            <Plus />
            {t("add")}
          </Button>
        )}
      </div>
      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border" data-testid="salary-rules">
          {rules.map((r) => {
            const ended = r.validTo !== null && r.validTo < today;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="font-medium">
                    {tt(r.type)} · <span className="tabular-nums">{value(r)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.groupId
                      ? (groupName.get(r.groupId) ?? "—")
                      : r.type === "fixed_monthly"
                        ? ""
                        : t("allGroups")}
                    {r.groupId || r.type !== "fixed_monthly" ? " · " : ""}
                    {r.validTo
                      ? t("period", { from: formatDate(r.validFrom), to: formatDate(r.validTo) })
                      : t("since", { from: formatDate(r.validFrom) })}
                    {ended && ` · ${t("ended")}`}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("edit")}
                      onClick={() =>
                        setEditing({
                          id: r.id,
                          staffId,
                          type: r.type,
                          amount: r.amount ?? undefined,
                          percent: r.percent ?? undefined,
                          groupId: r.groupId ?? "",
                          validFrom: formatDate(r.validFrom),
                          validTo: r.validTo ? formatDate(r.validTo) : "",
                        })
                      }
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("delete")}
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm(t("deleteConfirm"))) return;
                        start(async () => {
                          const res = await deleteSalaryRule(r.id);
                          if (!res.ok) toast.error(tk(res.error));
                          else router.refresh();
                        });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {editing && <RuleDialog initial={editing} groups={groups} onClose={() => setEditing(null)} />}
    </section>
  );
}

function RuleDialog({
  initial,
  groups,
  onClose,
}: {
  initial: SalaryRuleValues;
  groups: { id: string; name: string }[];
  onClose: () => void;
}) {
  const t = useTranslations("salary.rules");
  const tt = useTranslations("salary.types");
  const tc = useTranslations("common");
  const router = useRouter();
  const form = useForm<SalaryRuleValues>({
    resolver: zodResolver(salaryRuleSchema),
    defaultValues: initial,
  });
  const { error, pending, run } = useServerAction(form);
  const type = form.watch("type");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} data-testid="salary-rule-dialog">
        <DialogHeader>
          <DialogTitle>{initial.id ? t("editTitle") : t("addTitle")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => saveSalaryRule(v),
                () => {
                  toast.success(tc("saved"));
                  onClose();
                  router.refresh();
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{tt(field.value)}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SALARY_TYPES.map((k) => (
                        <SelectItem key={k} value={k}>
                          {tt(k)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t(`typeHints.${type}`)}</p>
                </FormItem>
              )}
            />
            {type === "percent_of_revenue" ? (
              <FormField
                control={form.control}
                name="percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("percent")}</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        value={
                          field.value === undefined ? "" : String(field.value).replace(".", ",")
                        }
                        onChange={(e) => {
                          const raw = e.target.value.replace(",", ".").replace(/[^\d.]/g, "");
                          field.onChange(raw === "" ? undefined : Number(raw));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{type === "per_lesson" ? t("lessonPrice") : t("amount")}</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value ?? null}
                        onChange={(v) => field.onChange(v ?? undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {type !== "fixed_monthly" && (
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("group")}</FormLabel>
                    <Select
                      value={field.value || ALL}
                      onValueChange={(v) => field.onChange(v === ALL ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {field.value
                              ? groups.find((g) => g.id === field.value)?.name
                              : type === "fixed_per_group"
                                ? t("chooseGroup")
                                : t("allGroups")}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {type !== "fixed_per_group" && (
                          <SelectItem value={ALL}>{t("allGroups")}</SelectItem>
                        )}
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("validFrom")}</FormLabel>
                    <FormControl>
                      <DateInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("validTo")}</FormLabel>
                    <FormControl>
                      <DateInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormError error={error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {tc("save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
