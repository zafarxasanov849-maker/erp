"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
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
import { type ScheduleConflict, type Weekday, addMinutes } from "@/lib/schedule";
import { timeField } from "@/lib/validation";

import { type SaveGroupResult, saveGroup } from "../actions";
import { formatTimeRange, formatWeekdays } from "../format";
import type { GroupFormOptions } from "../queries";
import { type GroupValues, groupSchema } from "../schema";
import { WeekdayPicker } from "./weekday-picker";

const NONE = "__none__";

export function GroupForm({
  defaults,
  options,
  branchPath,
}: {
  defaults: GroupValues;
  options: GroupFormOptions;
  /** /[branchId] — saqlangach guruh sahifasiga o'tish uchun */
  branchPath: string;
}) {
  const t = useTranslations("groups.form");
  const tc = useTranslations("common");
  const tw = useTranslations("weekdays");
  const router = useRouter();
  const form = useForm<GroupValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: defaults,
  });
  const { error, pending, run } = useServerAction(form);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);

  const branchId = useWatch({ control: form.control, name: "branchId" });
  const isEdit = Boolean(defaults.id);

  const courses = options.courses.filter((c) => c.is_active || c.id === defaults.courseId);
  const teachers = options.teachers.filter(
    (tch) => tch.allBranches || tch.branchIds.includes(branchId) || tch.id === defaults.teacherId,
  );
  const rooms = options.rooms.filter((r) => r.branch_id === branchId);

  function onCourseChange(courseId: string) {
    form.setValue("courseId", courseId, { shouldDirty: true, shouldValidate: true });
    const course = options.courses.find((c) => c.id === courseId);
    if (!course) return;
    // Narx va dars davomiyligi kursdan meros (o'zgartirsa bo'ladi)
    form.setValue("monthlyPrice", course.monthly_price, { shouldDirty: true });
    const start = form.getValues("startTime");
    if (timeField.safeParse(start).success && course.lesson_minutes) {
      form.setValue("endTime", addMinutes(start, course.lesson_minutes), { shouldDirty: true });
    }
  }

  function onSaved(result: SaveGroupResult) {
    if (!result.saved) {
      setConflicts(result.conflicts);
      return;
    }
    toast.success(tc("saved"));
    router.push(`${branchPath}/groups/${result.id}`);
  }

  return (
    <Form {...form}>
      <form
        className="grid max-w-3xl gap-6"
        onSubmit={form.handleSubmit((v) => {
          setConflicts([]);
          run(() => saveGroup(v), onSaved);
        })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name")}</FormLabel>
                <FormControl>
                  <Input autoFocus placeholder={t("namePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("branch")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    form.setValue("roomId", "");
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("choose")} />
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
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="courseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("course")}</FormLabel>
                <Select value={field.value} onValueChange={onCourseChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("choose")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
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
            name="monthlyPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("monthlyPrice")}</FormLabel>
                <FormControl>
                  <MoneyInput
                    value={field.value ?? null}
                    onChange={(v) => field.onChange(v ?? 0)}
                    currencyLabel={tc("currency")}
                  />
                </FormControl>
                <FormDescription>{t("priceHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="teacherId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("teacher")}</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("noTeacher")}</SelectItem>
                    {teachers.map((tch) => (
                      <SelectItem key={tch.id} value={tch.id}>
                        {tch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {options.teachers.length === 0 && (
                  <FormDescription>{t("noTeachersHint")}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("room")}</FormLabel>
                <Select
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("noRoom")}</SelectItem>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="weekdays"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t("weekdays")}</FormLabel>
              <WeekdayPicker
                value={field.value}
                onChange={field.onChange}
                invalid={!!fieldState.error}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("startTime")}</FormLabel>
                <FormControl>
                  <TimeInput
                    {...field}
                    onChange={(v) => {
                      field.onChange(v);
                      // Tugash vaqtini kurs davomiyligi bo'yicha siljitish
                      const course = options.courses.find(
                        (c) => c.id === form.getValues("courseId"),
                      );
                      if (timeField.safeParse(v).success && course?.lesson_minutes) {
                        form.setValue("endTime", addMinutes(v, course.lesson_minutes));
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("endTime")}</FormLabel>
                <FormControl>
                  <TimeInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("startDate")}</FormLabel>
                <FormControl>
                  <DateInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("endDate")}</FormLabel>
                <FormControl>
                  <DateInput {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isEdit && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div className="grid gap-1">
                  <FormLabel>{t("active")}</FormLabel>
                  <FormDescription>{t("activeHint")}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {conflicts.length > 0 && (
          <div
            role="alert"
            data-testid="schedule-conflicts"
            className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <span className="flex items-center gap-2 font-medium">
              <CircleAlert className="size-4" />
              {t("conflictsTitle")}
            </span>
            {conflicts.map((c) => (
              <span key={`${c.kind}-${c.groupId}`}>
                {t(c.kind === "room" ? "conflictRoom" : "conflictTeacher", {
                  resource: c.resourceName,
                  days: formatWeekdays(c.weekdays, (d) => tw(`short.${d as Weekday}`)),
                  time: formatTimeRange(c.startTime, c.endTime),
                  group: c.groupName,
                })}
              </span>
            ))}
          </div>
        )}
        <FormError error={error} />

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {tc("save")}
          </Button>
          <Button asChild variant="outline">
            <Link href={isEdit ? `${branchPath}/groups/${defaults.id}` : `${branchPath}/groups`}>
              {tc("cancel")}
            </Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
