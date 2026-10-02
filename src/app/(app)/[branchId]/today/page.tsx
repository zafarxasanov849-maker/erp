import { CalendarOff, ClipboardCheck, Clock, DoorOpen, Phone, User, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { getAbsentees, getAttendanceSettings, getDayLessons } from "@/features/attendance/queries";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { can, requirePagePermission } from "@/lib/auth";
import { TIMEZONE, formatDate, todayInTashkent } from "@/lib/dates";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("today") };
}

export default async function TodayPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const ctx = await requirePagePermission(["attendance.view", "attendance.manage"]);
  const t = await getTranslations("attendance.today");
  const format = await getFormatter();
  const orgId = ctx.membership.orgId;
  const branch = branchId === ALL_BRANCHES ? null : branchId;
  const today = todayInTashkent();
  const [lessons, absentees, settings] = await Promise.all([
    getDayLessons(orgId, today, branch),
    getAbsentees(orgId, branch),
    getAttendanceSettings(orgId),
  ]);
  const threshold = settings.absenceThreshold;
  const base = `/${branchId}`;
  const weekday = format.dateTime(new Date(`${today}T12:00:00Z`), {
    weekday: "long",
    timeZone: TIMEZONE,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {formatDate(today)}, {weekday}
        </p>
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title={t("noLessonsTitle")}
          description={t("noLessonsDescription")}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="today-lessons">
          {lessons.map((l) => {
            const cancelled = l.status === "cancelled";
            const complete = l.members > 0 && l.marked >= l.members;
            return (
              <li
                key={l.lesson_id}
                className={cn("grid gap-3 rounded-lg border p-4", cancelled && "bg-muted/40")}
                data-group={l.group_name}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="grid gap-1">
                    <span className="font-medium">{l.group_name}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="size-3.5" />
                        {l.start_time}–{l.end_time}
                      </span>
                      {l.room_name && (
                        <span className="flex items-center gap-1">
                          <DoorOpen className="size-3.5" />
                          {l.room_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
                        {l.teacher_name ?? t("noTeacher")}
                      </span>
                    </span>
                  </div>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                      cancelled
                        ? "text-muted-foreground"
                        : complete
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : l.marked > 0
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
                    )}
                    data-testid="lesson-status"
                  >
                    {cancelled
                      ? t("cancelled")
                      : l.marked === 0
                        ? t("notMarked")
                        : t("marked", { marked: l.marked, members: l.members })}
                  </span>
                </div>
                {cancelled ? (
                  l.cancel_reason && (
                    <span className="text-sm text-muted-foreground">{l.cancel_reason}</span>
                  )
                ) : (
                  <Button asChild variant={complete ? "outline" : "default"}>
                    <Link href={`${base}/lessons/${l.lesson_id}`}>
                      <ClipboardCheck />
                      {complete ? t("viewButton") : t("markButton")}
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="space-y-3" aria-labelledby="absentees-title">
        <div>
          <h2 id="absentees-title" className="text-lg font-semibold">
            {t("absenteesTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("absenteesHint", { count: threshold })}
          </p>
        </div>
        {absentees.length === 0 ? (
          <EmptyState
            icon={UserX}
            title={t("absenteesEmptyTitle")}
            description={t("absenteesEmptyDescription")}
          />
        ) : (
          <ul className="grid gap-2" data-testid="absentees">
            {absentees.map((a) => (
              <li
                key={a.enrollment_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div className="grid gap-0.5">
                  {can(ctx, "students.view") ? (
                    <Link
                      href={`${base}/students/${a.student_id}`}
                      className="font-medium hover:underline"
                    >
                      {a.full_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{a.full_name}</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {a.group_name} · {t("streak", { count: a.streak })} ·{" "}
                    {t("lastAbsent", { date: formatDate(a.last_absent) })}
                  </span>
                </div>
                {(a.parent_phone ?? a.phone) && (
                  <Button asChild variant="outline" size="sm">
                    <a href={`tel:${a.parent_phone ?? a.phone}`}>
                      <Phone />
                      <span className="tabular-nums">
                        {formatPhone(a.parent_phone ?? a.phone ?? "")}
                      </span>
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
