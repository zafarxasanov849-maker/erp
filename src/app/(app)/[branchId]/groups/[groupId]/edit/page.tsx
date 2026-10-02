import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GroupForm } from "@/features/groups/components/group-form";
import { getGroup, getGroupFormOptions } from "@/features/groups/queries";
import { requirePagePermission } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { normalizeTime } from "@/lib/schedule";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("groups");
  return { title: t("edit") };
}

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ branchId: string; groupId: string }>;
}) {
  const { branchId, groupId } = await params;
  const ctx = await requirePagePermission("groups.update");
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();
  const [group, options] = await Promise.all([
    getGroup(ctx.membership.orgId, groupId),
    getGroupFormOptions(ctx.membership.orgId),
  ]);
  if (!group) notFound();
  const t = await getTranslations("groups");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("edit")}: {group.name}
      </h1>
      <GroupForm
        branchPath={`/${branchId}`}
        options={options}
        defaults={{
          id: group.id,
          name: group.name,
          branchId: group.branch_id,
          courseId: group.course_id,
          teacherId: group.teacher_id ?? "",
          roomId: group.room_id ?? "",
          monthlyPrice: group.monthly_price,
          weekdays: group.weekdays,
          startTime: normalizeTime(group.start_time),
          endTime: normalizeTime(group.end_time),
          startDate: formatDate(group.start_date),
          endDate: group.end_date ? formatDate(group.end_date) : "",
          isActive: group.is_active,
        }}
      />
    </div>
  );
}
