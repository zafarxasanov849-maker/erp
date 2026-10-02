"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { PhoneInput } from "@/components/phone-input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useServerAction } from "@/hooks/use-server-action";

import { requestPasswordReset } from "../actions";
import { type ResetRequestValues, resetRequestSchema } from "../schema";

export function ResetForm() {
  const t = useTranslations("auth");
  const form = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { phone: "" },
  });
  const { error, pending, run } = useServerAction(form);

  return (
    <Form {...form}>
      <form
        className="grid gap-4"
        onSubmit={form.handleSubmit((v) => run(() => requestPasswordReset(v)))}
      >
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("phone")}</FormLabel>
              <FormControl>
                <PhoneInput autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormError error={error} />
        <Button type="submit" disabled={pending}>
          {t("sendCode")}
        </Button>
        <Link href="/login" className="text-center text-sm text-primary hover:underline">
          {t("backToLogin")}
        </Link>
      </form>
    </Form>
  );
}
