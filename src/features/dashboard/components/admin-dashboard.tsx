import { CalendarCheck, CalendarOff, HandCoins, Hourglass, Wallet } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { getAbsentees, getDayLessons } from "@/features/attendance/queries";
import { getDebtSummary, getRevenue, getStudentCounts } from "@/features/metrics/queries";
import { type OrgContext, can, canAny } from "@/lib/auth";
import type { IsoDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

import { DayLessonList } from "./day-lesson-list";
import { PanelSkeleton, StatCard, StatGridSkeleton } from "./stat-card";

interface Props {
  ctx: OrgContext;
  branchId: string | null;
  base: string;
  today: IsoDate;
}

/** Admin (qabulxona) bosh sahifasi: bugungi darslar, to'lovlar, qarzdorlar, sinovdagilar. */
export function AdminDashboard(props: Props) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<StatGridSkeleton count={4} />}>
        <AdminCards {...props} />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelSkeleton />
            <PanelSkeleton />
          </div>
        }
      >
        <AdminLists {...props} />
      </Suspense>
    </div>
  );
}

async function AdminCards({ ctx, branchId, base, today }: Props) {
  const t = await getTranslations("dashboard");
  const org = ctx.membership.orgId;
  const canLessons = canAny(ctx, ["attendance.view", "attendance.manage"]);
  const canMoney = can(ctx, "payments.view");
  const canStudents = can(ctx, "students.view");
  const none = Promise.resolve(null);
  const [lessons, paid, debt, counts] = await Promise.all([
    canLessons ? getDayLessons(org, today, branchId) : none,
    canMoney ? getRevenue(org, branchId, today, today) : none,
    canMoney ? getDebtSummary(org, branchId, today) : none,
    canStudents ? getStudentCounts(org, branchId, today) : none,
  ]);
  const held = lessons?.filter((l) => l.status !== "cancelled") ?? [];
  const unmarked = held.filter((l) => l.marked === 0).length;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="admin-cards">
      {lessons && (
        <StatCard
          testId="card-lessons"
          label={t("cards.lessonsToday")}
          icon={CalendarCheck}
          value={held.length}
          href={`${base}/today`}
          hint={
            held.length === 0
              ? t("cards.noLessons")
              : unmarked > 0
                ? t("cards.unmarked", { count: unmarked })
                : t("cards.allMarked")
          }
        />
      )}
      {paid && (
        <StatCard
          testId="card-paid-today"
          label={t("cards.paidToday")}
          icon={Wallet}
          value={formatMoney(paid.revenue)}
          href={`${base}/finance/payments`}
          hint={t("cards.payersToday", { count: paid.payers })}
        />
      )}
      {debt && (
        <StatCard
          testId="card-debtors"
          label={t("cards.debtors")}
          icon={HandCoins}
          value={debt.count}
          href={`${base}/finance`}
          hint={t("cards.debtorsHint", { amount: formatMoney(debt.total) })}
        />
      )}
      {counts && (
        <StatCard
          testId="card-trial"
          label={t("cards.trial")}
          icon={Hourglass}
          value={counts.trial}
          href={`${base}/students?status=trial`}
          hint={t("cards.trialHint")}
        />
      )}
    </div>
  );
}

async function AdminLists({ ctx, branchId, base, today }: Props) {
  if (!canAny(ctx, ["attendance.view", "attendance.manage"])) return null;
  const t = await getTranslations("dashboard");
  const org = ctx.membership.orgId;
  const [lessons, absentees] = await Promise.all([
    getDayLessons(org, today, branchId),
    getAbsentees(org, branchId),
  ]);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="min-w-0 space-y-3 rounded-xl border p-4" aria-labelledby="today-lessons">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="today-lessons" className="font-semibold">
            {t("lists.schedule")}
          </h2>
          <Link href={`${base}/today`} className="text-sm text-primary hover:underline">
            {t("lists.openToday")}
          </Link>
        </div>
        {lessons.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title={t("lists.noLessonsTitle")}
            description={t("lists.noLessonsDescription")}
            className="py-8"
          />
        ) : (
          <DayLessonList lessons={lessons} base={base} />
        )}
      </section>
      <section className="min-w-0 space-y-3 rounded-xl border p-4" aria-labelledby="absentees">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="absentees" className="font-semibold">
            {t("lists.absentees")}
          </h2>
          {absentees.length > 5 && (
            <Link href={`${base}/today`} className="text-sm text-primary hover:underline">
              {t("lists.all", { count: absentees.length })}
            </Link>
          )}
        </div>
        {absentees.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("lists.noAbsentees")}</p>
        ) : (
          <ul className="divide-y">
            {absentees.slice(0, 5).map((a) => (
              <li key={a.enrollment_id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
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
                  <div className="truncate text-xs text-muted-foreground">{a.group_name}</div>
                </div>
                <span className="text-sm whitespace-nowrap text-red-700 tabular-nums dark:text-red-400">
                  {t("lists.streak", { count: a.streak })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
