import { CalendarRange, Plus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { GroupFilters } from "@/features/groups/components/group-filters";
import { GroupsTable } from "@/features/groups/components/groups-table";
import { getGroupFormOptions, listGroups } from "@/features/groups/queries";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { can, requirePagePermission } from "@/lib/auth";
import { todayInTashkent } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("groups") };
}

const UUID = /^[0-9a-f-]{36}$/i;

export default async function GroupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<{ course?: string; teacher?: string; day?: string; status?: string }>;
}) {
  const { branchId } = await params;
  const sp = await searchParams;
  const ctx = await requirePagePermission("groups.view");
  const t = await getTranslations("groups");
  const orgId = ctx.membership.orgId;
  const day = Number(sp.day);

  const filters = {
    courseId: sp.course && UUID.test(sp.course) ? sp.course : undefined,
    teacherId: sp.teacher && UUID.test(sp.teacher) ? sp.teacher : undefined,
    weekday: day >= 1 && day <= 7 ? day : undefined,
    status: sp.status === "finished" ? ("finished" as const) : ("active" as const),
  };
  const [groups, options] = await Promise.all([
    listGroups(orgId, branchId === ALL_BRANCHES ? null : branchId, filters, todayInTashkent()),
    getGroupFormOptions(orgId),
  ]);
  const filtered = Boolean(filters.courseId || filters.teacherId || filters.weekday);
  const base = `/${branchId}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`${base}/groups/schedule`}>
              <CalendarRange />
              {t("weeklySchedule")}
            </Link>
          </Button>
          {can(ctx, "groups.create") && (
            <Button asChild>
              <Link href={`${base}/groups/new`}>
                <Plus />
                {t("add")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <GroupFilters courses={options.courses} teachers={options.teachers} />

      {groups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title={filtered ? t("emptyFilteredTitle") : t("emptyTitle")}
          description={
            filtered
              ? t("emptyFilteredDescription")
              : options.courses.length === 0
                ? t("emptyNoCourses")
                : t("emptyDescription")
          }
          action={
            !filtered && options.courses.length === 0 && can(ctx, "settings.catalogs") ? (
              <Button asChild variant="outline">
                <Link href={`${base}/settings/courses`}>{t("goToCourses")}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <GroupsTable groups={groups} branchPath={base} showBranch={branchId === ALL_BRANCHES} />
      )}
    </div>
  );
}
