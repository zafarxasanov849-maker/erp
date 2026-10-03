"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { ReasonDialog } from "@/components/reason-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerAction } from "@/hooks/use-server-action";
import { formatMoney } from "@/lib/money";

import { handoverCash, voidHandover } from "../actions";
import { type HandoverValues, handoverSchema } from "../schema";

const KASSA = "__kassa";

export interface HandoverOptions {
  targets: { id: string; name: string }[];
  methods: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  defaultBranchId: string;
  /** Mening qo'limdagi pul (to'lov turi → summa) */
  myBalance: Record<string, number>;
}

/** "Pul topshirish" (F): xodim → rahbar yoki filial kassasi */
export function HandoverButton({ options }: { options: HandoverOptions }) {
  const t = useTranslations("cash.handover");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const firstWithMoney =
    options.methods.find((m) => (options.myBalance[m.id] ?? 0) > 0) ?? options.methods[0];
  const form = useForm<HandoverValues>({
    resolver: zodResolver(handoverSchema),
    defaultValues: {
      branchId: options.defaultBranchId,
      toStaffId: options.targets[0]?.id ?? "",
      methodId: firstWithMoney?.id ?? "",
      amount:
        (options.myBalance[firstWithMoney?.id ?? ""] ?? 0) || (undefined as unknown as number),
      note: "",
    },
  });
  const { error, pending, run } = useServerAction(form);
  const methodId = form.watch("methodId");
  const amount = form.watch("amount");
  const available = options.myBalance[methodId] ?? 0;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <ArrowRightLeft />
        {t("button")}
      </Button>
      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent closeLabel={tc("close")} data-testid="handover-dialog">
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("hint")}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                className="grid gap-4"
                onSubmit={form.handleSubmit((v) =>
                  run(
                    () => handoverCash(v),
                    () => {
                      toast.success(t("done"));
                      setOpen(false);
                      form.reset();
                      router.refresh();
                    },
                  ),
                )}
              >
                <FormField
                  control={form.control}
                  name="toStaffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("to")}</FormLabel>
                      <Select
                        value={field.value || KASSA}
                        onValueChange={(v) => field.onChange(v === KASSA ? "" : v)}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {field.value
                                ? options.targets.find((s) => s.id === field.value)?.name
                                : t("kassa")}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {options.targets.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                          <SelectItem value={KASSA}>{t("kassa")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("amount")}</FormLabel>
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
                </div>
                <p className="text-sm text-muted-foreground" data-testid="handover-available">
                  {t("available", { amount: formatMoney(available) })}
                </p>
                {amount > available && (
                  <p className="text-sm text-amber-700 dark:text-amber-400">{t("overWarning")}</p>
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
                <FormError error={error} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {tc("cancel")}
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {t("submit")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export function VoidHandoverButton({ id, amount }: { id: string; amount: number }) {
  const t = useTranslations("cash.history");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={t("void")}
        title={t("void")}
        onClick={() => setOpen(true)}
      >
        <Ban />
      </Button>
      {open && (
        <ReasonDialog
          title={`${t("voidTitle")}: ${formatMoney(amount)}`}
          description={t("voidHint")}
          confirmLabel={t("voidConfirm")}
          doneMessage={t("voided")}
          onConfirm={(reason) => voidHandover({ id, reason })}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
