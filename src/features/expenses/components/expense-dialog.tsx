"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import { formatDate, todayInTashkent } from "@/lib/dates";

import { saveExpense } from "../actions";
import { type ExpenseValues, expenseSchema } from "../schema";

export interface ExpenseFormOptions {
  categories: { id: string; name: string }[];
  methods: { id: string; name: string; inHand: boolean }[];
  branches: { id: string; name: string }[];
  defaultBranchId: string;
}

export function AddExpenseButton({
  options,
  label,
}: {
  options: ExpenseFormOptions;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus />
        {label}
      </Button>
      {open && <ExpenseDialog options={options} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Xarajat qo'shish yoki tahrirlash (initial berilsa) */
export function ExpenseDialog({
  options,
  initial,
  onClose,
}: {
  options: ExpenseFormOptions;
  initial?: ExpenseValues;
  onClose: () => void;
}) {
  const t = useTranslations("expenses.form");
  const tc = useTranslations("common");
  const router = useRouter();
  const form = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initial ?? {
      id: "",
      branchId: options.defaultBranchId,
      categoryId: "",
      amount: undefined as unknown as number,
      methodId: options.methods[0]?.id ?? "",
      paidAt: formatDate(todayInTashkent()),
      recipient: "",
      note: "",
      fromKassa: false,
    },
  });
  const { error, pending, run } = useServerAction(form);
  const methodId = form.watch("methodId");
  const inHand = options.methods.find((m) => m.id === methodId)?.inHand ?? false;

  const select = (
    name: "categoryId" | "methodId" | "branchId",
    label: string,
    items: { id: string; name: string }[],
    placeholder?: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder}>
                  {items.find((i) => i.id === field.value)?.name}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} data-testid="expense-dialog">
        <DialogHeader>
          <DialogTitle>{initial ? t("editTitle") : t("title")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => saveExpense(v),
                () => {
                  toast.success(t("saved"));
                  onClose();
                  router.refresh();
                },
              ),
            )}
          >
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
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {select("categoryId", t("category"), options.categories, t("categoryPlaceholder"))}
              <FormField
                control={form.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("paidAt")}</FormLabel>
                    <FormControl>
                      <DateInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {select("methodId", t("method"), options.methods)}
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
              {options.branches.length > 1 && select("branchId", t("branch"), options.branches)}
            </div>
            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("recipient")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("note")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
