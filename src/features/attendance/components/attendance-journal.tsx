"use client";

import {
  CalendarX,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  NotebookPen,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Mark, isFrozenOn, isMemberOn, lessonEditable, nextStatus } from "@/lib/attendance";
import { isoWeekday } from "@/lib/dates";
import type { Weekday } from "@/lib/schedule";
import { cn } from "@/lib/utils";

import type { Journal, JournalLesson } from "../queries";
import { LessonNotesDialog } from "./lesson-notes-dialog";
import { MarkBadge } from "./mark-cell";
import { useMarks } from "./use-marks";

export function AttendanceJournal({
  journal,
  month,
  monthLabel,
  prevHref,
  nextHref,
  branchPath,
}: {
  journal: Journal;
  /** YYYY-MM */
  month: string;
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  branchPath: string;
}) {
  const t = useTranslations("attendance.journal");
  const tw = useTranslations("weekdays");
  const { get, set, saving, savingLabel } = useMarks(journal.marks);
  const [notesFor, setNotesFor] = useState<JournalLesson | null>(null);
  const late = useMemo(
    () =>
      new Set(
        journal.marks.filter((m) => m.lateMarked).map((m) => `${m.lessonId}:${m.enrollmentId}`),
      ),
    [journal.marks],
  );

  const editability = (l: JournalLesson) =>
    journal.canEdit ? lessonEditable(l, journal.today, journal.editDays) : "readonly";

  function allPresent(l: JournalLesson) {
    set(
      l.id,
      journal.students
        .filter(
          (s) =>
            isMemberOn(s, l.date) && !isFrozenOn(s, l.date) && get(l.id, s.enrollmentId) === null,
        )
        .map((s) => ({ enrollmentId: s.enrollmentId, status: "present" as Mark })),
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3" data-testid="attendance-journal" data-month={month}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={t("prevMonth")}
          >
            <Link href={prevHref} scroll={false}>
              <ChevronLeft />
            </Link>
          </Button>
          <span className="min-w-32 text-center text-sm font-medium capitalize">{monthLabel}</span>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={t("nextMonth")}
          >
            <Link href={nextHref} scroll={false}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        <span
          className={cn(
            "text-xs",
            saving ? "text-muted-foreground" : "text-emerald-700 dark:text-emerald-400",
          )}
          aria-live="polite"
          data-testid="save-state"
          data-saving={saving || undefined}
        >
          {savingLabel}
        </span>
      </div>

      {!journal.canEdit ? (
        <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
      ) : journal.editDays !== null ? (
        <p className="text-sm text-muted-foreground">
          {t("editWindow", { days: journal.editDays })}
        </p>
      ) : null}

      {journal.lessons.length === 0 ? (
        <EmptyState icon={CalendarX} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : journal.students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("noStudentsTitle")}
          description={t("noStudentsDescription")}
        />
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-lg border">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-40 border-b bg-background px-3 py-2 text-left font-medium">
                  {t("student")}
                </th>
                {journal.lessons.map((l) => {
                  const state = editability(l);
                  return (
                    <th
                      key={l.id}
                      className={cn(
                        "border-b border-l px-1 py-1 text-center font-normal",
                        l.status === "cancelled" && "bg-muted/60 text-muted-foreground",
                        l.date === journal.today && "bg-primary/5",
                      )}
                      title={
                        l.status === "cancelled"
                          ? t("cancelled", { reason: l.cancelReason ?? "" })
                          : (l.topic ?? undefined)
                      }
                      data-lesson={l.date}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex w-10 flex-col items-center rounded-md px-1 py-0.5 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label={l.date}
                        >
                          <span className="text-sm font-medium tabular-nums">
                            {l.date.slice(8, 10)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {tw(`short.${isoWeekday(l.date) as Weekday}`)}
                          </span>
                          {l.topic && (
                            <NotebookPen className="mt-0.5 size-3 text-muted-foreground" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center">
                          {state === "ok" && (
                            <DropdownMenuItem onSelect={() => allPresent(l)}>
                              <ClipboardCheck />
                              {t("allPresent")}
                            </DropdownMenuItem>
                          )}
                          {state !== "future" && l.status !== "cancelled" && (
                            <DropdownMenuItem asChild>
                              <Link href={`${branchPath}/lessons/${l.id}`}>
                                <ClipboardCheck />
                                {t("markLesson")}
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => setNotesFor(l)}>
                            <NotebookPen />
                            {t("notes")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {journal.students.map((s) => (
                <tr key={s.enrollmentId} data-student={s.fullName}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 max-w-48 truncate border-b bg-background px-3 py-1 text-left font-normal"
                  >
                    {s.fullName}
                  </th>
                  {journal.lessons.map((l) => {
                    const cancelled = l.status === "cancelled";
                    const member = isMemberOn(s, l.date);
                    const frozen = member && isFrozenOn(s, l.date);
                    const mark = get(l.id, s.enrollmentId);
                    const state = editability(l);
                    const cellClass = cn(
                      "border-b border-l p-1 text-center",
                      cancelled && "bg-muted/60",
                      l.date === journal.today && !cancelled && "bg-primary/5",
                    );
                    if (cancelled || !member) {
                      return (
                        <td
                          key={l.id}
                          className={cn(cellClass, !member && "bg-muted/30")}
                          title={!member ? t("notMember") : undefined}
                        />
                      );
                    }
                    if (frozen) {
                      return (
                        <td key={l.id} className={cellClass} title={t("frozen")}>
                          <span className="text-muted-foreground" aria-label={t("frozen")}>
                            ❄
                          </span>
                        </td>
                      );
                    }
                    const isLate = late.has(`${l.id}:${s.enrollmentId}`);
                    return (
                      <td key={l.id} className={cellClass}>
                        {state === "ok" ? (
                          <button
                            type="button"
                            className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            onClick={() =>
                              set(l.id, [
                                { enrollmentId: s.enrollmentId, status: nextStatus(mark) },
                              ])
                            }
                            data-cell={`${s.fullName}|${l.date}`}
                            data-mark={mark ?? ""}
                          >
                            <MarkBadge status={mark} late={isLate} />
                          </button>
                        ) : (
                          <span
                            title={
                              state === "future"
                                ? t("future")
                                : state === "closed"
                                  ? t("closed")
                                  : undefined
                            }
                            data-cell={`${s.fullName}|${l.date}`}
                            data-mark={mark ?? ""}
                          >
                            <MarkBadge
                              status={mark}
                              late={isLate}
                              className={cn(!mark && "opacity-40")}
                            />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Legend />
      {notesFor && (
        <LessonNotesDialog
          lesson={notesFor}
          readOnly={editability(notesFor) === "closed" || !journal.canEdit}
          onClose={() => setNotesFor(null)}
        />
      )}
    </div>
  );
}

export function Legend() {
  const t = useTranslations("attendance");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {(["present", "late", "absent", "excused"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <MarkBadge status={s} className="size-6 text-[10px]" />
          {t(`statuses.${s}`)}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-foreground" />
        {t("journal.lateMarked")}
      </span>
      <span>❄ {t("journal.frozen")}</span>
    </div>
  );
}
