"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
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

import { resendCode, verifyCode } from "../actions";
import { type OtpPurpose, type VerifyValues, verifySchema } from "../schema";

const RESEND_SECONDS = 60;

export function VerifyForm({ phone, purpose }: { phone: string; purpose: OtpPurpose }) {
  const t = useTranslations("auth");
  const tk = useTranslateKey();
  const form = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { phone, purpose, code: "" },
  });
  const { error, pending, run } = useServerAction(form);
  const resend = useServerAction();
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit((v) => run(() => verifyCode(v)))}>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("code")}</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  className="text-center text-lg tracking-[0.5em]"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormError error={error ?? resend.error} />
        <Button type="submit" disabled={pending}>
          {t("confirm")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={seconds > 0 || resend.pending}
          onClick={() =>
            resend.run(
              () => resendCode(phone, purpose),
              () => {
                setSeconds(RESEND_SECONDS);
                toast.success(tk("auth.codeResent"));
              },
            )
          }
        >
          {seconds > 0 ? t("resendIn", { seconds }) : t("resend")}
        </Button>
      </form>
    </Form>
  );
}
