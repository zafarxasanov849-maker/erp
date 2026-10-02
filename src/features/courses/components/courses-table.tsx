"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

import { saveCourse } from "../actions";
import type { CourseRow } from "../queries";
import { type CourseValues, courseSchema } from "../schema";

const EMPTY: CourseValues = { name: "", monthlyPrice: 0, lessonMinutes: 90, isActive: true };

export function CoursesTable({ courses }: { courses: CourseRow[] }) {
  const t = useTranslations("settings.courses");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CourseValues | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus />
          {t("add")}
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead className="text-right">{t("monthlyPrice")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("lessonMinutes")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow
                  key={c.id}
                  className={cn("cursor-pointer", !c.is_active && "opacity-60")}
                  onClick={() => {
                    setEditing({
                      id: c.id,
                      name: c.name,
                      monthlyPrice: c.monthly_price,
                      lessonMinutes: c.lesson_minutes ?? 90,
                      isActive: c.is_active,
                    });
                    setOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(c.monthly_price)}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                    {t("minutes", { count: c.lesson_minutes ?? 0 })}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={c.is_active ? "secondary" : "outline"}>
                      {c.is_active ? t("activeBadge") : t("inactiveBadge")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CourseDialog open={open} onOpenChange={setOpen} course={editing} />
    </div>
  );
}

function CourseDialog({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseValues | null;
}) {
  const t = useTranslations("settings.courses");
  const tc = useTranslations("common");
  const form = useForm<CourseValues>({ resolver: zodResolver(courseSchema), defaultValues: EMPTY });
  const { error, setError, pending, run } = useServerAction(form);

  useEffect(() => {
    if (open) {
      form.reset(course ?? EMPTY);
      setError(null);
    }
  }, [open, course, form, setError]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{course ? t("edit") : t("add")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => saveCourse(v),
                () => {
                  toast.success(tc("saved"));
                  onOpenChange(false);
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
                    <Input autoFocus placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lessonMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("lessonMinutes")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={15}
                        max={600}
                        step={5}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {course && (
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
            <FormError error={error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
