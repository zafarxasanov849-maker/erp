import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";

import { EmptyState } from "@/components/empty-state";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { AddStudentLink } from "@/features/students/components/add-student-link";
import { StudentsFilters } from "@/features/students/components/students-filters";
import { StudentsTable } from "@/features/students/components/students-table";
import { getStudentFilterOptions, listStudents } from "@/features/students/queries";
import { hasStudentFilters, loadStudentSearchParams } from "@/features/students/search-params";
import { can, requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("students") };
}

export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("students.view");
  const t = await getTranslations("students");
  const sp = await loadStudentSearchParams(searchParams);
  const orgId = ctx.membership.orgId;
  const allBranches = branchId === ALL_BRANCHES;

  const [list, options] = await Promise.all([
    listStudents(orgId, allBranches ? null : branchId, sp),
    getStudentFilterOptions(orgId),
  ]);
  const filtered = hasStudentFilters(sp);
  const groups = options.groups.filter((g) => allBranches || g.branch_id === branchId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <AddStudentLink />
      </div>

      <StudentsFilters
        groups={groups.map((g) => ({ value: g.id, label: g.name }))}
        courses={options.courses.map((c) => ({ value: c.id, label: c.name }))}
        teachers={options.teachers.map((x) => ({ value: x.id, label: x.name }))}
        tags={options.tags.map((x) => ({ value: x.id, label: x.name }))}
        branches={allBranches ? ctx.branches.map((b) => ({ value: b.id, label: b.name })) : null}
      />

      {list.rows.length === 0 && list.page === 1 ? (
        <EmptyState
          icon={Users}
          title={filtered ? t("list.emptyFilteredTitle") : t("list.emptyTitle")}
          description={filtered ? t("list.emptyFilteredDescription") : t("list.emptyDescription")}
          action={filtered ? undefined : <AddStudentLink />}
        />
      ) : (
        <StudentsTable
          rows={list.rows}
          total={list.total}
          page={list.page}
          pages={list.pages}
          branchId={branchId}
          branchNames={
            allBranches ? Object.fromEntries(ctx.branches.map((b) => [b.id, b.name])) : null
          }
          tags={options.tags}
          canExport={can(ctx, "students.export")}
          canUpdate={can(ctx, "students.update")}
          canSeeMoney={can(ctx, "payments.view")}
          canPay={can(ctx, "payments.create")}
        />
      )}
    </div>
  );
}
