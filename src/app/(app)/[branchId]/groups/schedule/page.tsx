import { CalendarRange } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { ScheduleGrid } from "@/features/groups/components/schedule-grid";
import { getWeeklySchedule } from "@/features/groups/queries";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { requirePagePermission } from "@/lib/auth";
import { isoWeekday, todayInTashkent } from "@/lib/dates";
import { WEEKDAYS, type Weekday } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("groups");
  return { title: t("weeklySchedule") };
}

const NO_ROOM = "__no_room__";

export default async function WeeklySchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<{ day?: string; branch?: string }>;
}) {
  const { branchId } = await params;
  const sp = await searchParams;
  const ctx = await requirePagePermission("groups.view");
  const t = await getTranslations("groups");
  const tw = await getTranslations("weekdays");

  // "Barcha filiallar" rejimida jadval bitta filial uchun ko'rsatiladi
  const branch =
    branchId === ALL_BRANCHES
      ? (ctx.branches.find((b) => b.id === sp.branch) ?? ctx.branches[0])
      : ctx.branches.find((b) => b.id === branchId);
  const dayNum = Number(sp.day);
  const day = (dayNum >= 1 && dayNum <= 7 ? dayNum : isoWeekday(todayInTashkent())) as Weekday;
  const base = `/${branchId}`;
  const qs = (next: { day?: number; branch?: string }) => {
    const p = new URLSearchParams();
    p.set("day", String(next.day ?? day));
    if (branchId === ALL_BRANCHES && (next.branch ?? branch?.id))
      p.set("branch", next.branch ?? branch!.id);
    return `${base}/groups/schedule?${p}`;
  };

  if (!branch) {
    return <EmptyState icon={CalendarRange} title={t("schedule.noBranch")} />;
  }

  const data = await getWeeklySchedule(ctx.membership.orgId, branch.id, day);
  const columns = [
    ...data.rooms.map((r) => ({ id: r.id, name: r.name })),
    ...(data.groups.some((g) => !g.roomId) ? [{ id: NO_ROOM, name: t("schedule.noRoom") }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("weeklySchedule")}</h1>
        <Link href={`${base}/groups`} className="text-sm text-muted-foreground hover:underline">
          ← {t("backToList")}
        </Link>
      </div>

      {branchId === ALL_BRANCHES && ctx.branches.length > 1 && (
        <nav className="flex flex-wrap gap-1" aria-label={t("schedule.branch")}>
          {ctx.branches.map((b) => (
            <Link
              key={b.id}
              href={qs({ branch: b.id })}
              aria-current={b.id === branch.id ? "page" : undefined}
              className={cn(
                "rounded-md border px-3 py-1 text-sm",
                b.id === branch.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {b.name}
            </Link>
          ))}
        </nav>
      )}

      <nav className="flex gap-1 overflow-x-auto" aria-label={t("schedule.day")}>
        {WEEKDAYS.map((d) => (
          <Link
            key={d}
            href={qs({ day: d })}
            aria-current={d === day ? "page" : undefined}
            title={tw(`long.${d}`)}
            className={cn(
              "min-w-11 rounded-md border px-3 py-1.5 text-center text-sm font-medium",
              d === day ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {tw(`short.${d}`)}
          </Link>
        ))}
      </nav>

      {data.groups.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title={t("schedule.emptyTitle", { day: tw(`long.${day}`) })}
          description={t("schedule.emptyDescription")}
        />
      ) : (
        <ScheduleGrid
          columns={columns}
          workStart={data.workStart}
          workEnd={data.workEnd}
          hrefFor={(id) => `${base}/groups/${id}`}
          blocks={data.groups.map((g) => ({
            id: g.id,
            name: g.name,
            columnId: g.roomId ?? NO_ROOM,
            startTime: g.startTime,
            endTime: g.endTime,
            subtitle: [g.courseName, g.teacherName].filter(Boolean).join(" · "),
          }))}
        />
      )}
    </div>
  );
}
