import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RolesTable } from "@/features/roles/components/roles-table";
import { listRoles } from "@/features/roles/queries";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("roles") };
}

export default async function RolesPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("settings.roles");
  const roles = await listRoles(ctx.membership.orgId);
  return <RolesTable roles={roles} basePath={`/${branchId}/settings/roles`} />;
}
