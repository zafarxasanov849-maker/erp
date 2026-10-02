import { CalendarCheck, CalendarOff, ClipboardList, Users, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { getDayLessons } from "@/features/attendance/queries";
import { getTeacherSummary } from "@/features/metrics/queries";
import type { OrgContext } from "@/lib/auth";
import type { IsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

import { DayLessonList } from "./day-lesson-list";
import { PanelSkeleton, StatCard, StatGridSkeleton } from "./stat-card";

interface Props {
  ctx: OrgContext;
  base: string;
  today: IsoDate;
}

/** Ustoz bosh sahifasi: o'z guruhlari, talabalari, bugungi darslari va belgilanmaganlar. */
export function TeacherDashboard(props: Props) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<StatGridSkeleton count={4} />}>
        <TeacherCards {...props} />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <TeacherLessons {...props} />
      </Suspense>
    </div>
  );
}

async function TeacherCards({ ctx, base, today }: Props) {
  const t = await getTranslations("dashboard");
  const s = await getTeacherSummary(ctx.membership.orgId, today);
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="teacher-cards"
    >
      <StatCard
        testId="card-my-groups"
        label={t("cards.myGroups")}
        icon={UsersRound}
        value={s.groups}
        href={`${base}/groups`}
      />
      <StatCard
        testId="card-my-students"
        label={t("cards.myStudents")}
        icon={Users}
        value={s.students}
      />
      <StatCard
        testId="card-my-lessons"
        label={t("cards.lessonsToday")}
        icon={CalendarCheck}
        value={s.lessons}
        href={`${base}/today`}
      />
      <StatCard
        testId="card-my-unmarked"
        label={t("cards.unmarkedLessons")}
        icon={ClipboardList}
        value={s.unmarked}
        href={`${base}/today`}
        hint={s.unmarked > 0 ? t("cards.unmarkedHint") : undefined}
      />
    </div>
  );
}

async function TeacherLessons({ ctx, base, today }: Props) {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const [lessons, own] = await Promise.all([
    getDayLessons(ctx.membership.orgId, today, null),
    supabase
      .from("groups")
      .select("id")
      .eq("organization_id", ctx.membership.orgId)
      .eq("teacher_id", ctx.membership.staffId),
  ]);
  const ownIds = new Set((own.data ?? []).map((g) => g.id));
  const mine = lessons.filter((l) => ownIds.has(l.group_id));
  return (
    <section className="min-w-0 space-y-3 rounded-xl border p-4" aria-labelledby="my-lessons">
      <h2 id="my-lessons" className="font-semibold">
        {t("lists.mySchedule")}
      </h2>
      {mine.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title={t("lists.noLessonsTitle")}
          description={t("lists.noMyLessonsDescription")}
          className="py-8"
        />
      ) : (
        <DayLessonList lessons={mine} base={base} />
      )}
    </section>
  );
}
