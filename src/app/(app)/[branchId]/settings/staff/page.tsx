import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { listBranches } from "@/features/branches/queries";
import { listRoles } from "@/features/roles/queries";
import { StaffTable } from "@/features/staff/components/staff-table";
import { listStaff } from "@/features/staff/queries";
import { can, requirePagePermission } from "@/lib/auth";
import { WILDCARD, isSubset } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("staff") };
}

export default async function StaffSettingsPage() {
  const ctx = await requirePagePermission("settings.staff");
  const orgId = ctx.membership.orgId;
  const [staff, roles, branches] = await Promise.all([
    listStaff(orgId),
    listRoles(orgId),
    listBranches(orgId),
  ]);
  const mine = ctx.membership.permissions;

  return (
    <StaffTable
      staff={staff}
      allBranchNames={Object.fromEntries(branches.map((b) => [b.id, b.name]))}
      options={{
        // Faqat o'zi bera oladigan rollar (bazadagi staff_guard bilan bir xil)
        roles: roles
          .filter((r) => isSubset(r.permissions, mine))
          .map((r) => ({ id: r.id, name: r.name })),
        branches: branches.filter((b) => b.is_active).map((b) => ({ id: b.id, name: b.name })),
        canGrantAllBranches: mine.includes(WILDCARD) || can(ctx, "branches.all"),
      }}
    />
  );
}
