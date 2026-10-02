import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { GroupForm } from "@/features/groups/components/group-form";
import { getGroupFormOptions } from "@/features/groups/queries";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { can, requirePagePermission } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("groups");
  return { title: t("add") };
}

export default async function NewGroupPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("groups.create");
  const t = await getTranslations("groups");
  const options = await getGroupFormOptions(ctx.membership.orgId);
  // Faqat foydalanuvchi ko'ra oladigan filiallar
  const branches = options.branches.filter(
    (b) => ctx.membership.allBranches || ctx.branches.some((x) => x.id === b.id),
  );
  const activeCourses = options.courses.filter((c) => c.is_active);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("add")}</h1>
      {activeCourses.length === 0 ? (
        <EmptyState
          title={t("emptyNoCoursesTitle")}
          description={t("emptyNoCourses")}
          action={
            can(ctx, "settings.catalogs") ? (
              <Button asChild>
                <Link href={`/${branchId}/settings/courses`}>{t("goToCourses")}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <GroupForm
          branchPath={`/${branchId}`}
          options={{ ...options, branches }}
          defaults={{
            name: "",
            branchId: branchId !== ALL_BRANCHES ? branchId : (branches[0]?.id ?? ""),
            courseId: "",
            teacherId: "",
            roomId: "",
            monthlyPrice: 0,
            weekdays: [],
            startTime: "",
            endTime: "",
            startDate: formatDate(todayInTashkent()),
            endDate: "",
            isActive: true,
          }}
        />
      )}
    </div>
  );
}
