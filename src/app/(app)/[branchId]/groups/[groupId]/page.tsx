import { CalendarX, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceJournal } from "@/features/attendance/components/attendance-journal";
import { getJournal } from "@/features/attendance/queries";
import { GroupMembers } from "@/features/groups/components/group-members";
import { LessonsList } from "@/features/groups/components/lessons-list";
import { formatTimeRange, formatWeekdays } from "@/features/groups/format";
import { getGroup, listGroupLessons, listGroupMembers } from "@/features/groups/queries";
import { AddStudentLink } from "@/features/students/components/add-student-link";
import { can, requirePagePermission } from "@/lib/auth";
import {
  TIMEZONE,
  addDays,
  formatDate,
  monthBounds,
  shiftMonth,
  todayInTashkent,
} from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { LESSON_HORIZON_DAYS, type Weekday } from "@/lib/schedule";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;
  const t = await getTranslations("nav");
  void groupId;
  return { title: t("groups") };
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string; groupId: string }>;
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const { branchId, groupId } = await params;
  const sp = await searchParams;
  const ctx = await requirePagePermission("groups.view");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();
  const group = await getGroup(ctx.membership.orgId, groupId);
  if (!group) notFound();

  const t = await getTranslations("groups");
  const tw = await getTranslations("weekdays");
  const today = todayInTashkent();
  const canSeeStudents = can(ctx, "students.view");
  const canSeeAttendance =
    can(ctx, "attendance.view") ||
    can(ctx, "attendance.manage") ||
    group.teacher_id === ctx.membership.staffId;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const [monthFrom, monthTo] = monthBounds(month);
  const [lessons, members, journal] = await Promise.all([
    listGroupLessons(group.id, addDays(today, -30), addDays(today, LESSON_HORIZON_DAYS)),
    canSeeStudents ? listGroupMembers(group.id) : Promise.resolve([]),
    canSeeAttendance ? getJournal(group.id, monthFrom, monthTo) : Promise.resolve(null),
  ]);
  const format = await getFormatter();
  const monthLabel = format.dateTime(new Date(`${monthFrom}T12:00:00Z`), {
    month: "long",
    year: "numeric",
    timeZone: TIMEZONE,
  });
  const tabs = ["lessons", "students", "attendance"];
  const tab =
    sp.tab && tabs.includes(sp.tab) ? sp.tab : journal && sp.month ? "attendance" : "lessons";
  const monthHref = (m: string) => `/${branchId}/groups/${group.id}?tab=attendance&month=${m}`;

  const info: [string, string][] = [
    [t("detail.course"), group.course?.name ?? "—"],
    [t("detail.teacher"), group.teacherName ?? "—"],
    [t("detail.room"), group.room?.name ?? "—"],
    [t("detail.branch"), group.branch?.name ?? "—"],
    [
      t("detail.schedule"),
      `${formatWeekdays(group.weekdays, (d) => tw(`short.${d as Weekday}`))} · ${formatTimeRange(group.start_time, group.end_time)}`,
    ],
    [t("detail.price"), formatMoney(group.monthly_price)],
    [
      t("detail.period"),
      group.end_date
        ? `${formatDate(group.start_date)} — ${formatDate(group.end_date)}`
        : t("detail.since", { date: formatDate(group.start_date) }),
    ],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            {group.name}
            {!group.is_active && <Badge variant="outline">{t("finishedBadge")}</Badge>}
          </h1>
          <Link
            href={`/${branchId}/groups`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← {t("backToList")}
          </Link>
        </div>
        {can(ctx, "groups.update") && (
          <Button asChild variant="outline">
            <Link href={`/${branchId}/groups/${group.id}/edit`}>
              <Pencil />
              {t("edit")}
            </Link>
          </Button>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-lg border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {info.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="lessons">{t("tabs.lessons")}</TabsTrigger>
          <TabsTrigger value="students" disabled={!canSeeStudents}>
            {t("tabs.students")}
            {canSeeStudents && (
              <span className="text-muted-foreground tabular-nums">
                {members.filter((m) => m.status !== "left").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="attendance" disabled={!journal}>
            {t("tabs.attendance")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="pt-2">
          <GroupMembers
            members={members}
            branchPath={`/${branchId}`}
            action={
              group.is_active ? <AddStudentLink groupId={group.id} variant="outline" /> : undefined
            }
          />
        </TabsContent>
        {journal && (
          <TabsContent value="attendance" className="pt-2">
            <AttendanceJournal
              journal={journal}
              month={month}
              monthLabel={monthLabel}
              prevHref={monthHref(shiftMonth(month, -1))}
              nextHref={monthHref(shiftMonth(month, 1))}
              branchPath={`/${branchId}`}
            />
          </TabsContent>
        )}
        <TabsContent value="lessons" className="pt-2">
          {lessons.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title={t("lessons.emptyTitle")}
              description={
                group.is_active ? t("lessons.emptyDescription") : t("lessons.emptyFinished")
              }
            />
          ) : (
            <LessonsList lessons={lessons} today={today} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
