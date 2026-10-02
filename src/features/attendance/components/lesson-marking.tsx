"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useServerAction } from "@/hooks/use-server-action";
import { ATTENDANCE_STATUSES, isFrozenOn, isMemberOn, lessonEditable } from "@/lib/attendance";
import { cn } from "@/lib/utils";

import { saveLessonNotes } from "../actions";
import type { Journal, JournalLesson } from "../queries";
import { type LessonNotesValues, lessonNotesSchema } from "../schema";
import { LessonNotesFields } from "./lesson-notes-dialog";
import { MARK_STYLES } from "./mark-cell";
import { useMarks } from "./use-marks";

/** Bitta darsni telefondan tez belgilash: "Hammasi keldi", keyin faqat istisnolar. */
export function LessonMarking({ journal, lesson }: { journal: Journal; lesson: JournalLesson }) {
  const t = useTranslations("attendance");
  const { get, set, saving, savingLabel } = useMarks(journal.marks);
  const state = journal.canEdit
    ? lessonEditable(lesson, journal.today, journal.editDays)
    : "readonly";
  const editable = state === "ok";

  const students = journal.students.filter((s) => isMemberOn(s, lesson.date));
  const active = students.filter((s) => !isFrozenOn(s, lesson.date));
  const marked = active.filter((s) => get(lesson.id, s.enrollmentId) !== null).length;

  const notice =
    state === "cancelled"
      ? t("lesson.cancelled", { reason: lesson.cancelReason ?? "" })
      : state === "future"
        ? t("lesson.future")
        : state === "closed"
          ? t("lesson.closed")
          : state === "readonly"
            ? t("lesson.readOnly")
            : null;

  return (
    <div className="grid grid-cols-1 gap-4">
      {notice && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("lesson.noStudentsTitle")}
          description={t("lesson.noStudentsDescription")}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium tabular-nums" data-testid="lesson-progress">
              {t("lesson.progress", { marked, members: active.length })}
            </span>
            <span
              className="text-xs text-muted-foreground"
              aria-live="polite"
              data-testid="save-state"
              data-saving={saving || undefined}
            >
              {savingLabel}
            </span>
          </div>
          {editable && (
            <Button
              size="lg"
              className="h-12 text-base"
              onClick={() =>
                set(
                  lesson.id,
                  active
                    .filter((s) => get(lesson.id, s.enrollmentId) === null)
                    .map((s) => ({ enrollmentId: s.enrollmentId, status: "present" as const })),
                )
              }
              disabled={marked === active.length}
            >
              <CheckCheck />
              {t("journal.allPresent")}
            </Button>
          )}
          <ul className="grid gap-2" data-testid="lesson-students">
            {students.map((s) => {
              const frozen = isFrozenOn(s, lesson.date);
              const mark = get(lesson.id, s.enrollmentId);
              return (
                <li
                  key={s.enrollmentId}
                  className="grid gap-2 rounded-lg border p-3"
                  data-student={s.fullName}
                  data-mark={mark ?? ""}
                >
                  <span className="text-sm font-medium">{s.fullName}</span>
                  {frozen ? (
                    <span className="text-sm text-muted-foreground">❄ {t("journal.frozen")}</span>
                  ) : (
                    <div
                      className="grid grid-cols-4 gap-1.5"
                      role="radiogroup"
                      aria-label={s.fullName}
                    >
                      {ATTENDANCE_STATUSES.map((status) => {
                        const on = mark === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            aria-label={`${s.fullName}: ${t(`statuses.${status}`)}`}
                            disabled={!editable}
                            onClick={() =>
                              set(lesson.id, [
                                { enrollmentId: s.enrollmentId, status: on ? null : status },
                              ])
                            }
                            className={cn(
                              "flex h-11 flex-col items-center justify-center rounded-md border text-xs leading-tight font-medium transition-colors disabled:cursor-not-allowed",
                              on ? MARK_STYLES[status] : "bg-background hover:bg-accent",
                              !on && !editable && "opacity-50",
                            )}
                          >
                            <span className="text-sm font-semibold">{t(`short.${status}`)}</span>
                            <span className="max-sm:sr-only">{t(`statuses.${status}`)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <LessonNotesForm
        lesson={lesson}
        readOnly={!(editable || (journal.canEdit && state === "future"))}
      />
    </div>
  );
}

function LessonNotesForm({ lesson, readOnly }: { lesson: JournalLesson; readOnly: boolean }) {
  const t = useTranslations("attendance.notes");
  const tc = useTranslations("common");
  const form = useForm<LessonNotesValues>({
    resolver: zodResolver(lessonNotesSchema),
    defaultValues: {
      lessonId: lesson.id,
      topic: lesson.topic ?? "",
      homework: lesson.homework ?? "",
    },
  });
  const { error, pending, run } = useServerAction(form);
  return (
    <Form {...form}>
      <form
        className="grid gap-3 rounded-lg border p-3"
        onSubmit={form.handleSubmit((v) =>
          run(
            () => saveLessonNotes(v),
            () => {
              toast.success(tc("saved"));
              form.reset(v);
            },
          ),
        )}
      >
        <h2 className="text-sm font-medium">{t("title")}</h2>
        <LessonNotesFields form={form} readOnly={readOnly} />
        <FormError error={error} />
        {!readOnly && (
          <Button type="submit" variant="outline" className="justify-self-end" disabled={pending}>
            {tc("save")}
          </Button>
        )}
      </form>
    </Form>
  );
}
