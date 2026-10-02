"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRightLeft,
  CirclePlay,
  LogOut,
  MoreHorizontal,
  Snowflake,
  Sun,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { type FieldValues, type UseFormReturn, useForm } from "react-hook-form";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatWeekdays } from "@/features/groups/format";
import { useServerAction } from "@/hooks/use-server-action";
import { useTranslateKey } from "@/i18n/use-translate-key";
import { formatDate } from "@/lib/dates";
import type { Weekday } from "@/lib/schedule";
import { cn } from "@/lib/utils";

import {
  activateEnrollment,
  endFreeze,
  enrollStudent,
  freezeEnrollment,
  leaveEnrollment,
  transferEnrollment,
} from "../actions";
import type { EnrollableGroup } from "../form-data";
import type { EnrollmentRow } from "../profile";
import {
  type ActivateValues,
  type EnrollValues,
  type FreezeValues,
  type LeaveValues,
  type TransferValues,
  activateSchema,
  enrollSchema,
  freezeSchema,
  leaveSchema,
  transferSchema,
} from "../schema";
import { GroupMeta, GroupSearch } from "./group-search";
import { EnrollmentStatusBadge } from "./status-badge";

const NONE = "__none__";

type Reason = { id: string; name: string };

type DialogState =
  | { kind: "enroll" }
  | { kind: "activate" | "transfer" | "freeze" | "leave"; enrollment: EnrollmentRow }
  | null;

export function EnrollmentsPanel({
  studentId,
  branchPath,
  enrollments,
  groups,
  leaveReasons,
  freezeReasons,
  todayIso,
  canUpdate,
  archived,
}: {
  studentId: string;
  branchPath: string;
  enrollments: EnrollmentRow[];
  groups: EnrollableGroup[];
  leaveReasons: Reason[];
  freezeReasons: Reason[];
  todayIso: string;
  canUpdate: boolean;
  archived: boolean;
}) {
  const t = useTranslations("students.enrollments");
  const today = formatDate(todayIso);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [showLeft, setShowLeft] = useState(false);
  const open = enrollments.filter((e) => e.status !== "left");
  const left = enrollments.filter((e) => e.status === "left");
  const editable = canUpdate && !archived;

  return (
    <div className="grid gap-3">
      {editable && (
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => setDialog({ kind: "enroll" })}
        >
          <UserPlus />
          {t("add")}
        </Button>
      )}

      {open.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={t("emptyTitle")}
          description={editable ? t("emptyDescription") : undefined}
        />
      ) : (
        open.map((e) => (
          <EnrollmentCard
            key={e.id}
            enrollment={e}
            branchPath={branchPath}
            todayIso={todayIso}
            editable={editable}
            onAction={(kind) => setDialog({ kind, enrollment: e })}
          />
        ))
      )}

      {left.length > 0 && (
        <div className="grid gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start text-muted-foreground"
            onClick={() => setShowLeft((v) => !v)}
          >
            {t("showLeft", { count: left.length })}
          </Button>
          {showLeft &&
            left.map((e) => (
              <EnrollmentCard
                key={e.id}
                enrollment={e}
                branchPath={branchPath}
                todayIso={todayIso}
                editable={false}
                onAction={() => {}}
              />
            ))}
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        {dialog?.kind === "enroll" && (
          <EnrollDialog
            studentId={studentId}
            groups={groups}
            excludeIds={open.map((e) => e.group.id)}
            today={today}
            onDone={() => setDialog(null)}
          />
        )}
        {dialog?.kind === "activate" && (
          <ActivateDialog
            enrollment={dialog.enrollment}
            today={today}
            onDone={() => setDialog(null)}
          />
        )}
        {dialog?.kind === "transfer" && (
          <TransferDialog
            enrollment={dialog.enrollment}
            groups={groups}
            excludeIds={open.map((e) => e.group.id)}
            reasons={leaveReasons}
            today={today}
            onDone={() => setDialog(null)}
          />
        )}
        {dialog?.kind === "freeze" && (
          <FreezeDialog
            enrollment={dialog.enrollment}
            reasons={freezeReasons}
            today={today}
            onDone={() => setDialog(null)}
          />
        )}
        {dialog?.kind === "leave" && (
          <LeaveDialog
            enrollment={dialog.enrollment}
            reasons={leaveReasons}
            today={today}
            onDone={() => setDialog(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function EnrollmentCard({
  enrollment: e,
  branchPath,
  todayIso,
  editable,
  onAction,
}: {
  enrollment: EnrollmentRow;
  todayIso: string;
  branchPath: string;
  editable: boolean;
  onAction: (kind: "activate" | "transfer" | "freeze" | "leave") => void;
}) {
  const t = useTranslations("students.enrollments");
  const tw = useTranslations("weekdays");
  const tk = useTranslateKey();
  const end = useServerAction();
  // Hozirgi yoki kelajakdagi muzlatish
  const currentFreeze = e.freezes.find((f) => f.to >= todayIso);

  const since =
    e.status === "left" && e.leftAt
      ? t("leftOn", { date: formatDate(e.leftAt) })
      : e.activatedAt
        ? t("activeSince", { date: formatDate(e.activatedAt) })
        : t("trialSince", { date: formatDate(e.joinedAt) });

  return (
    <div
      className={cn("grid gap-2 rounded-lg border p-3", e.status === "left" && "opacity-70")}
      data-testid="enrollment"
      data-group={e.group.name}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`${branchPath}/groups/${e.group.id}`}
              className="font-medium hover:underline"
            >
              {e.group.name}
            </Link>
            <EnrollmentStatusBadge status={e.status} />
          </div>
          <span className="text-xs text-muted-foreground">
            {[
              e.group.courseName,
              e.group.teacherName,
              `${formatWeekdays(e.group.weekdays, (d) => tw(`short.${d as Weekday}`))} ${e.group.startTime}–${e.group.endTime}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {e.status === "trial" && (
                <DropdownMenuItem onSelect={() => onAction("activate")}>
                  <CirclePlay />
                  {t("activate")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => onAction("transfer")}>
                <ArrowRightLeft />
                {t("transfer")}
              </DropdownMenuItem>
              {e.status !== "trial" && !currentFreeze && (
                <DropdownMenuItem onSelect={() => onAction("freeze")}>
                  <Snowflake />
                  {t("freeze")}
                </DropdownMenuItem>
              )}
              {currentFreeze && (
                <DropdownMenuItem
                  onSelect={() => {
                    if (!window.confirm(t("endFreezeConfirm"))) return;
                    end.run(
                      () => endFreeze(currentFreeze.id),
                      () => toast.success(t("done")),
                    );
                  }}
                >
                  <Sun />
                  {t("endFreeze")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => onAction("leave")}>
                <LogOut />
                {t("leave")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{since}</span>
        {e.status === "left" && e.leaveReason && <span>{e.leaveReason}</span>}
        {currentFreeze && (
          <span className="text-indigo-700 dark:text-indigo-400">
            {t(currentFreeze.from > todayIso ? "plannedFreeze" : "frozenRange", {
              from: formatDate(currentFreeze.from),
              to: formatDate(currentFreeze.to),
            })}
            {currentFreeze.reasonName && ` · ${currentFreeze.reasonName}`}
          </span>
        )}
      </div>
      {end.error && <p className="text-sm text-destructive">{tk(end.error)}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialoglar
// ---------------------------------------------------------------------------

function ActionDialog<V extends FieldValues>({
  title,
  description,
  form,
  onSubmit,
  error,
  pending,
  children,
}: {
  title: string;
  description?: ReactNode;
  form: UseFormReturn<V>;
  onSubmit: (values: V) => void;
  error: string | null;
  pending: boolean;
  children: ReactNode;
}) {
  const tc = useTranslations("common");
  return (
    <DialogContent closeLabel={tc("close")}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          {children}
          <FormError error={error} />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {tc("save")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

function DateField<V extends FieldValues>({
  form,
  name,
  label,
}: {
  form: UseFormReturn<V>;
  name: string;
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name as never}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <DateInput {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ReasonField<V extends FieldValues>({
  form,
  name,
  label,
  reasons,
  optional,
}: {
  form: UseFormReturn<V>;
  name: string;
  label: string;
  reasons: Reason[];
  optional?: boolean;
}) {
  const t = useTranslations("students.enrollments");
  return (
    <FormField
      control={form.control}
      name={name as never}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {reasons.length === 0 && !optional ? (
            <p className="text-sm text-muted-foreground">{t("noReasons")}</p>
          ) : (
            <Select
              value={(field.value as string) || (optional ? NONE : "")}
              onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("reason")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {optional && <SelectItem value={NONE}>{t("noReason")}</SelectItem>}
                {reasons.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function useDone(onDone: () => void) {
  const t = useTranslations("students.enrollments");
  return () => {
    toast.success(t("done"));
    onDone();
  };
}

function EnrollDialog({
  studentId,
  groups,
  excludeIds,
  today,
  onDone,
}: {
  studentId: string;
  groups: EnrollableGroup[];
  excludeIds: string[];
  today: string;
  onDone: () => void;
}) {
  const t = useTranslations("students");
  const form = useForm<EnrollValues>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { studentId, groupId: "", status: "trial", date: today },
  });
  const { error, pending, run } = useServerAction(form);
  const done = useDone(onDone);
  const [group, setGroup] = useState<EnrollableGroup | null>(null);

  return (
    <ActionDialog
      title={t("enrollments.add")}
      form={form}
      error={error}
      pending={pending}
      onSubmit={(v) => run(() => enrollStudent(v), done)}
    >
      <FormField
        control={form.control}
        name="groupId"
        render={() => (
          <FormItem>
            <FormLabel>{t("enrollments.group")}</FormLabel>
            {group ? (
              <GroupChip
                group={group}
                onClear={() => (setGroup(null), form.setValue("groupId", ""))}
              />
            ) : (
              <GroupSearch
                groups={groups}
                excludeIds={excludeIds}
                onPick={(g) => {
                  setGroup(g);
                  form.setValue("groupId", g.id, { shouldValidate: true });
                }}
              />
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("enrollments.status")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="trial">{t("enrollmentStatuses.trial")}</SelectItem>
                  <SelectItem value="active">{t("enrollmentStatuses.active")}</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <DateField form={form} name="date" label={t("sheet.startDate")} />
      </div>
    </ActionDialog>
  );
}

function GroupChip({ group, onClear }: { group: EnrollableGroup; onClear: () => void }) {
  const tc = useTranslations("common");
  return (
    <div className="flex items-start justify-between gap-2 rounded-md border p-3">
      <div className="grid gap-0.5">
        <span className="text-sm font-medium">{group.name}</span>
        <GroupMeta group={group} />
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        {tc("remove")}
      </Button>
    </div>
  );
}

function ActivateDialog({
  enrollment,
  today,
  onDone,
}: {
  enrollment: EnrollmentRow;
  today: string;
  onDone: () => void;
}) {
  const t = useTranslations("students.enrollments");
  const form = useForm<ActivateValues>({
    resolver: zodResolver(activateSchema),
    defaultValues: { enrollmentId: enrollment.id, date: today },
  });
  const { error, pending, run } = useServerAction(form);
  const done = useDone(onDone);
  return (
    <ActionDialog
      title={`${t("activate")}: ${enrollment.group.name}`}
      form={form}
      error={error}
      pending={pending}
      onSubmit={(v) => run(() => activateEnrollment(v), done)}
    >
      <DateField form={form} name="date" label={t("activateDate")} />
    </ActionDialog>
  );
}

function TransferDialog({
  enrollment,
  groups,
  excludeIds,
  reasons,
  today,
  onDone,
}: {
  enrollment: EnrollmentRow;
  groups: EnrollableGroup[];
  excludeIds: string[];
  reasons: Reason[];
  today: string;
  onDone: () => void;
}) {
  const t = useTranslations("students.enrollments");
  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { enrollmentId: enrollment.id, groupId: "", date: today, reasonId: "" },
  });
  const { error, pending, run } = useServerAction(form);
  const done = useDone(onDone);
  const [group, setGroup] = useState<EnrollableGroup | null>(null);
  return (
    <ActionDialog
      title={`${t("transfer")}: ${enrollment.group.name}`}
      description={t("transferHint")}
      form={form}
      error={error}
      pending={pending}
      onSubmit={(v) => run(() => transferEnrollment(v), done)}
    >
      <FormField
        control={form.control}
        name="groupId"
        render={() => (
          <FormItem>
            <FormLabel>{t("newGroup")}</FormLabel>
            {group ? (
              <GroupChip
                group={group}
                onClear={() => (setGroup(null), form.setValue("groupId", ""))}
              />
            ) : (
              <GroupSearch
                groups={groups}
                excludeIds={excludeIds}
                onPick={(g) => {
                  setGroup(g);
                  form.setValue("groupId", g.id, { shouldValidate: true });
                }}
              />
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <DateField form={form} name="date" label={t("transferDate")} />
      <ReasonField
        form={form}
        name="reasonId"
        label={t("reasonOptional")}
        reasons={reasons}
        optional
      />
    </ActionDialog>
  );
}

function FreezeDialog({
  enrollment,
  reasons,
  today,
  onDone,
}: {
  enrollment: EnrollmentRow;
  reasons: Reason[];
  today: string;
  onDone: () => void;
}) {
  const t = useTranslations("students.enrollments");
  const form = useForm<FreezeValues>({
    resolver: zodResolver(freezeSchema),
    defaultValues: { enrollmentId: enrollment.id, from: today, to: "", reasonId: "" },
  });
  const { error, pending, run } = useServerAction(form);
  const done = useDone(onDone);
  return (
    <ActionDialog
      title={`${t("freeze")}: ${enrollment.group.name}`}
      description={t("freezeHint")}
      form={form}
      error={error}
      pending={pending}
      onSubmit={(v) => run(() => freezeEnrollment(v), done)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField form={form} name="from" label={t("from")} />
        <DateField form={form} name="to" label={t("to")} />
      </div>
      <ReasonField
        form={form}
        name="reasonId"
        label={t("reasonOptional")}
        reasons={reasons}
        optional
      />
    </ActionDialog>
  );
}

function LeaveDialog({
  enrollment,
  reasons,
  today,
  onDone,
}: {
  enrollment: EnrollmentRow;
  reasons: Reason[];
  today: string;
  onDone: () => void;
}) {
  const t = useTranslations("students.enrollments");
  const form = useForm<LeaveValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { enrollmentId: enrollment.id, date: today, reasonId: "" },
  });
  const { error, pending, run } = useServerAction(form);
  const done = useDone(onDone);
  return (
    <ActionDialog
      title={`${t("leave")}: ${enrollment.group.name}`}
      description={t("leaveHint")}
      form={form}
      error={error}
      pending={pending}
      onSubmit={(v) => run(() => leaveEnrollment(v), done)}
    >
      <DateField form={form} name="date" label={t("date")} />
      <ReasonField form={form} name="reasonId" label={t("reason")} reasons={reasons} />
    </ActionDialog>
  );
}
