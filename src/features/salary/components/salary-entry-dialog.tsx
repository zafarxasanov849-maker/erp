"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { ReasonDialog } from "@/components/reason-dialog";
import { Badge } from "@/components/ui/badge";
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
import { formatDate, todayInTashkent } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { addSalaryEntry, voidSalaryEntry } from "../actions";
import { type SALARY_ENTRY_KINDS, type SalaryEntryValues, salaryEntrySchema } from "../schema";

export interface EntryOptions {
  staffId: string;
  month: string;
  due: number;
  methods: { id: string; name: string; inHand: boolean }[];
  branches: { id: string; name: string }[];
  defaultBranchId: string;
}

type Kind = (typeof SALARY_ENTRY_KINDS)[number];

/** Bonus, jarima, oyga xos o'zgartirish, pul berish (K, L) */
export function SalaryEntryButtons({ options }: { options: EntryOptions }) {
  const t = useTranslations("salary.entry");
  const [kind, setKind] = useState<Kind | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setKind("payout")}>
        <Plus />
        {t("kinds.payout")}
      </Button>
      {(["bonus", "penalty", "override"] as const).map((k) => (
        <Button key={k} size="sm" variant="outline" onClick={() => setKind(k)}>
          {t(`kinds.${k}`)}
        </Button>
      ))}
      {kind && <EntryDialog kind={kind} options={options} onClose={() => setKind(null)} />}
    </div>
  );
}

function EntryDialog({
  kind,
  options,
  onClose,
}: {
  kind: Kind;
  options: EntryOptions;
  onClose: () => void;
}) {
  const t = useTranslations("salary.entry");
  const tc = useTranslations("common");
  const router = useRouter();
  const form = useForm<SalaryEntryValues>({
    resolver: zodResolver(salaryEntrySchema),
    defaultValues: {
      staffId: options.staffId,
      month: options.month,
      kind,
      amount: kind === "payout" && options.due > 0 ? options.due : (undefined as unknown as number),
      note: "",
      methodId: kind === "payout" ? (options.methods[0]?.id ?? "") : "",
      branchId: kind === "payout" ? options.defaultBranchId : "",
      fromKassa: false,
      paidOn: kind === "payout" ? formatDate(todayInTashkent()) : "",
    },
  });
  const { error, pending, run } = useServerAction(form);
  const methodId = form.watch("methodId");
  const inHand = options.methods.find((m) => m.id === methodId)?.inHand ?? false;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} data-testid="salary-entry-dialog">
        <DialogHeader>
          <DialogTitle>{t(`titles.${kind}`)}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => addSalaryEntry(v),
                () => {
                  toast.success(t("saved"));
                  onClose();
                  router.refresh();
                },
              ),
            )}
          >
            {kind === "override" && (
              <p className="text-sm text-muted-foreground">{t("overrideHint")}</p>
            )}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("amount")}</FormLabel>
                  <FormControl>
                    <MoneyInput
                      autoFocus
                      value={field.value ?? null}
                      onChange={(v) => field.onChange(v ?? undefined)}
                    />
                  </FormControl>
                  {kind === "payout" && (
                    <p className="text-xs text-muted-foreground">
                      {t("dueHint", { amount: formatMoney(options.due) })}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {kind === "payout" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="methodId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("method")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {options.methods.find((m) => m.id === field.value)?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options.methods.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paidOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("paidOn")}</FormLabel>
                      <FormControl>
                        <DateInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {inHand && (
                  <FormField
                    control={form.control}
                    name="fromKassa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("source")}</FormLabel>
                        <Select
                          value={field.value ? "kassa" : "hand"}
                          onValueChange={(v) => field.onChange(v === "kassa")}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {field.value ? t("fromKassa") : t("fromHand")}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hand">{t("fromHand")}</SelectItem>
                            <SelectItem value="kassa">{t("fromKassa")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
                {options.branches.length > 1 && (
                  <FormField
                    control={form.control}
                    name="branchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("branch")}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue>
                                {options.branches.find((b) => b.id === field.value)?.name}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {options.branches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("note")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            {kind === "payout" && (
              <p className="text-xs text-muted-foreground">{t("payoutHint")}</p>
            )}
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

export interface EntryRow {
  id: string;
  kind: Kind;
  amount: number;
  note: string | null;
  paidOn: string | null;
  createdAt: string;
  voided: boolean;
  voidReason: string | null;
}

/** Oy yozuvlari ro'yxati; bekor qilish — sabab bilan (L) */
export function SalaryEntriesList({
  entries,
  canManage,
}: {
  entries: EntryRow[];
  canManage: boolean;
}) {
  const t = useTranslations("salary.entry");
  const [voiding, setVoiding] = useState<EntryRow | null>(null);
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {t("empty")}
      </p>
    );
  }
  return (
    <>
      <ul className="divide-y rounded-lg border" data-testid="salary-entries">
        {entries.map((e) => (
          <li
            key={e.id}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-2",
              e.voided && "text-muted-foreground",
            )}
          >
            <div className="min-w-0">
              <div className="font-medium">
                {t(`kinds.${e.kind}`)}
                {e.voided && (
                  <Badge variant="outline" className="ml-2">
                    {t("voidedBadge")}
                  </Badge>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {formatDate(e.paidOn ?? e.createdAt)}
                {(e.voided ? e.voidReason : e.note) && ` · ${e.voided ? e.voidReason : e.note}`}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "font-medium whitespace-nowrap tabular-nums",
                  e.voided && "line-through",
                )}
              >
                {e.kind === "penalty" ? "−" : ""}
                {formatMoney(e.amount)}
              </span>
              {canManage && !e.voided && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t("void")}
                  title={t("void")}
                  onClick={() => setVoiding(e)}
                >
                  <Ban />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {voiding && (
        <ReasonDialog
          title={`${t("voidTitle")}: ${t(`kinds.${voiding.kind}`)} ${formatMoney(voiding.amount)}`}
          description={voiding.kind === "payout" ? t("voidPayoutHint") : undefined}
          confirmLabel={t("voidConfirm")}
          doneMessage={t("voided")}
          onConfirm={(reason) => voidSalaryEntry({ id: voiding.id, reason })}
          onClose={() => setVoiding(null)}
        />
      )}
    </>
  );
}
