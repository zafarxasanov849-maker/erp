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
  FormDescription,
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
        <h2 className="pt-2 text-sm font-semibold">{t("attendanceTitle")}</h2>
        <FormField
          control={form.control}
          name="teacherEditDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("teacherEditDays")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={30}
                  className="w-28"
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>{t("teacherEditDaysHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="absenceThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("absenceThreshold")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  className="w-28"
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>{t("absenceThresholdHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <h2 className="pt-2 text-sm font-semibold">{t("financeTitle")}</h2>
        <FormField
          control={form.control}
          name="rounding"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("rounding")}</FormLabel>
              <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                <FormControl>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {([1, 100, 1000] as const).map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {t(`rounding${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t("roundingHint")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="refundOnLeave"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal">{t("refundOnLeave")}</FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="trialLessons"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("trialLessons")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={20}
                  className="w-28"
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>{t("trialLessonsHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
