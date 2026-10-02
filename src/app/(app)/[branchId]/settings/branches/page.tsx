import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BranchesTable } from "@/features/branches/components/branches-table";
import { listBranches } from "@/features/branches/queries";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("branches") };
}

export default async function BranchesSettingsPage() {
  const ctx = await requirePagePermission("settings.branches");
  const branches = await listBranches(ctx.membership.orgId);
  return <BranchesTable branches={branches} />;
}
