"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { type PaymentFormData, getPaymentFormData, receivePayment } from "../actions";
import { type PaymentValues, paymentSchema } from "../schema";

const AUTO = "__auto__";

/** "To'lov qabul qilish" tugmasi + dialog (profil va ro'yxatda) */
export function PaymentButton({
  studentId,
  label,
  size,
  variant = "default",
  iconOnly = false,
}: {
  studentId: string;
  label: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={iconOnly ? "icon" : size}
        variant={variant}
        className={cn(iconOnly && "size-8")}
        onClick={() => setOpen(true)}
        aria-label={label}
        title={iconOnly ? label : undefined}
      >
        <Wallet />
        {!iconOnly && label}
      </Button>
      {open && <PaymentDialog studentId={studentId} onClose={() => setOpen(false)} />}
    </>
  );
}

function PaymentDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const t = useTranslations("billing.payment");
  const tc = useTranslations("common");
  const [data, setData] = useState<PaymentFormData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPaymentFormData(studentId).then((r) => {
      if (cancelled) return;
      if (r.ok) setData(r.data);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")} data-testid="payment-dialog">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          {data && (
            <DialogDescription>
              {data.studentName} · {t("balance")}:{" "}
              <span className={cn("font-medium tabular-nums", data.balance < 0 && "text-red-600")}>
                {formatMoney(data.balance)}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>
        {data ? (
          <PaymentForm studentId={studentId} data={data} onDone={onClose} />
        ) : failed ? (
          <FormError error="billing.payment.loadError" />
        ) : (
          <div className="grid gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  studentId,
  data,
  onDone,
}: {
  studentId: string;
  data: PaymentFormData;
  onDone: () => void;
}) {
  const t = useTranslations("billing.payment");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useParams<{ branchId: string }>();
  const debt = data.balance < 0 ? -data.balance : null;
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId,
      amount: debt as number,
      methodId: data.methods[0]?.id ?? "",
      paidOn: formatDate(todayInTashkent()),
      enrollmentId: "",
      note: "",
      key: crypto.randomUUID(),
    },
  });
  const { error, pending, run } = useServerAction(form);

  return (
    <Form {...form}>
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit((v) =>
          run(
            () => receivePayment(v),
            ({ paymentRef, receiptNo }) => {
              const href = `/${params.branchId}/payments/${paymentRef}`;
              toast.success(t("saved", { no: receiptNo }), {
                action: { label: t("receipt"), onClick: () => window.open(href, "_blank") },
              });
              onDone();
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
          <FormField
            control={form.control}
            name="methodId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("method")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {data.methods.map((m) => (
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
        </div>
        {data.enrollments.length > 0 && (
          <FormField
            control={form.control}
            name="enrollmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("group")}</FormLabel>
                <Select
                  value={field.value || AUTO}
                  onValueChange={(v) => field.onChange(v === AUTO ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={AUTO}>{t("groupAuto")}</SelectItem>
                    {data.enrollments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.groupName}
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
              <FormMessage />
            </FormItem>
          )}
        />
        <FormError error={error} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
