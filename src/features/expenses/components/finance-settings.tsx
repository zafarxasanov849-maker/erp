"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServerAction } from "@/hooks/use-server-action";
import { useTranslateKey } from "@/i18n/use-translate-key";

import { saveExpenseCategory, setMethodInHand } from "../actions";
import type { ExpenseCategory, MethodWithHand } from "../queries";
import { EXPENSE_KINDS, type ExpenseCategoryValues, expenseCategorySchema } from "../schema";

/** Sozlamalar → Moliya: xarajat turkumlari (turi bilan) va to'lov turlari ("qo'lda qoladi", D) */
export function FinanceSettings({
  categories,
  methods,
}: {
  categories: ExpenseCategory[];
  methods: MethodWithHand[];
}) {
  const t = useTranslations("settings.finance");
  const tk = useTranslations("expenses.kinds");
  const [editing, setEditing] = useState<ExpenseCategoryValues | null>(null);

  return (
    <div className="grid gap-8">
      <section className="grid gap-3" aria-labelledby="expense-categories">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="expense-categories" className="font-semibold">
              {t("categories")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("categoriesHint")}</p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditing({ id: "", name: "", kind: "operating", isActive: true })}
          >
            <Plus />
            {t("addCategory")}
          </Button>
        </div>
        <div className="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("kind")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.name}
                    {!c.isActive && (
                      <Badge variant="outline" className="ml-2">
                        {t("inactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{tk(c.kind)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("edit")}
                      onClick={() =>
                        setEditing({ id: c.id, name: c.name, kind: c.kind, isActive: c.isActive })
                      }
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="grid gap-3" aria-labelledby="payment-methods">
        <div>
          <h2 id="payment-methods" className="font-semibold">
            {t("methods")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("methodsHint")}</p>
        </div>
        <div className="min-w-0 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("method")}</TableHead>
                <TableHead className="text-right">{t("inHand")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods
                .filter((m) => !m.isParent)
                .map((m) => (
                  <MethodRow key={m.id} method={m} />
                ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {editing && <CategoryDialog initial={editing} onClose={() => setEditing(null)} kinds={tk} />}
    </div>
  );
}

function MethodRow({ method }: { method: MethodWithHand }) {
  const t = useTranslations("settings.finance");
  const tk = useTranslateKey();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <TableRow>
      <TableCell>
        <label htmlFor={`in-hand-${method.id}`} className="font-medium">
          {method.name}
        </label>
        {!method.isActive && (
          <Badge variant="outline" className="ml-2">
            {t("inactive")}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Switch
          id={`in-hand-${method.id}`}
          checked={method.inHand}
          disabled={pending}
          onCheckedChange={(v) =>
            start(async () => {
              const r = await setMethodInHand(method.id, v);
              if (!r.ok) toast.error(tk(r.error));
              else router.refresh();
            })
          }
        />
      </TableCell>
    </TableRow>
  );
}

function CategoryDialog({
  initial,
  onClose,
  kinds,
}: {
  initial: ExpenseCategoryValues;
  onClose: () => void;
  kinds: (k: (typeof EXPENSE_KINDS)[number]) => string;
}) {
  const t = useTranslations("settings.finance");
  const tc = useTranslations("common");
  const router = useRouter();
  const form = useForm<ExpenseCategoryValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: initial,
  });
  const { error, pending, run } = useServerAction(form);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{initial.id ? t("editCategory") : t("addCategory")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => saveExpenseCategory(v),
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("kind")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue>{kinds(field.value)}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {kinds(k)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("kindHint")}</p>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-2">
                  <FormLabel>{t("active")}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
