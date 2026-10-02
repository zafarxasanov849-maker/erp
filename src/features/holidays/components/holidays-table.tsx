"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { addHoliday, removeHoliday } from "../actions";
import type { HolidayRow } from "../queries";
import { type HolidayValues, holidaySchema } from "../schema";

const ALL = "__all__";

export function HolidaysTable({
  holidays,
  branches,
  today,
}: {
  holidays: HolidayRow[];
  branches: { id: string; name: string }[];
  today: string;
}) {
  const t = useTranslations("settings.holidays");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const del = useServerAction();

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Button onClick={() => setOpen(true)}>
          <Plus />
          {t("add")}
        </Button>
      </div>
      <FormError error={del.error} />

      {holidays.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("reason")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("scope")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {t("cancelledLessons")}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((h) => (
                <TableRow key={h.id} className={cn(h.date < today && "opacity-60")}>
                  <TableCell className="font-medium tabular-nums">{formatDate(h.date)}</TableCell>
                  <TableCell>{h.reason}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {h.branch?.name ?? t("allBranches")}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {h.cancelledLessons}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={tc("delete")}
                      disabled={del.pending}
                      onClick={() => {
                        if (!window.confirm(t("deleteConfirm", { date: formatDate(h.date) })))
                          return;
                        del.run(
                          () => removeHoliday(h.id),
                          (data) => toast.success(t("deleted", { count: data.restored })),
                        );
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <HolidayDialog open={open} onOpenChange={setOpen} branches={branches} />
    </div>
  );
}

function HolidayDialog({
  open,
  onOpenChange,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: { id: string; name: string }[];
}) {
  const t = useTranslations("settings.holidays");
  const tc = useTranslations("common");
  const empty: HolidayValues = { date: "", branchId: "", reason: "" };
  const form = useForm<HolidayValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: empty,
  });
  const { error, setError, pending, run } = useServerAction(form);

  useEffect(() => {
    if (open) {
      form.reset(empty);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
          <DialogDescription>{t("addHint")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit((v) =>
              run(
                () => addHoliday(v),
                (data) => {
                  toast.success(t("added", { count: data.cancelled }));
                  onOpenChange(false);
                },
              ),
            )}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("date")}</FormLabel>
                    <FormControl>
                      <DateInput autoFocus {...field} />
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
                    <FormLabel>{t("scope")}</FormLabel>
                    <Select
                      value={field.value || ALL}
                      onValueChange={(v) => field.onChange(v === ALL ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ALL}>{t("allBranches")}</SelectItem>
                        {branches.map((b) => (
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
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("reason")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("reasonPlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
