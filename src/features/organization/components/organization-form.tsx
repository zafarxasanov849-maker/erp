"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
import { TimeInput } from "@/components/time-input";
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

import { updateOrganization } from "../actions";
import { type OrganizationValues, organizationSchema } from "../schema";

export function OrganizationForm({ defaults }: { defaults: OrganizationValues }) {
  const t = useTranslations("settings.organization");
  const tc = useTranslations("common");
  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: defaults,
  });
  const { error, pending, run } = useServerAction(form);

  return (
    <Form {...form}>
      <form
        className="grid max-w-lg gap-4"
        onSubmit={form.handleSubmit((v) =>
          run(
            () => updateOrganization(v),
            () => {
              form.reset(v);
              toast.success(tc("saved"));
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="primaryColor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("color")}</FormLabel>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={t("color")}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                />
                <FormControl>
                  <Input className="w-32 font-mono" maxLength={7} {...field} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="workStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("workStart")}</FormLabel>
                <FormControl>
                  <TimeInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="workEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("workEnd")}</FormLabel>
                <FormControl>
                  <TimeInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormError error={error} />
        <div>
          <Button type="submit" disabled={pending || !form.formState.isDirty}>
            {tc("save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
