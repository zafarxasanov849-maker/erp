import { CalendarX, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupMembers } from "@/features/groups/components/group-members";
import { LessonsList } from "@/features/groups/components/lessons-list";
import { formatTimeRange, formatWeekdays } from "@/features/groups/format";
import { getGroup, listGroupLessons, listGroupMembers } from "@/features/groups/queries";
import { AddStudentLink } from "@/features/students/components/add-student-link";
import { can, requirePagePermission } from "@/lib/auth";
import { addDays, formatDate, todayInTashkent } from "@/lib/dates";
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
}: {
  params: Promise<{ branchId: string; groupId: string }>;
}) {
  const { branchId, groupId } = await params;
  const ctx = await requirePagePermission("groups.view");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();
  const group = await getGroup(ctx.membership.orgId, groupId);
  if (!group) notFound();

  const t = await getTranslations("groups");
  const tw = await getTranslations("weekdays");
  const today = todayInTashkent();
  const canSeeStudents = can(ctx, "students.view");
  const [lessons, members] = await Promise.all([
    listGroupLessons(group.id, addDays(today, -30), addDays(today, LESSON_HORIZON_DAYS)),
    canSeeStudents ? listGroupMembers(group.id) : Promise.resolve([]),
  ]);

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

      <Tabs defaultValue="lessons">
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
          <TabsTrigger value="attendance" disabled>
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
