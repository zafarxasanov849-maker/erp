import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { TagsTable } from "@/features/tags/components/tags-table";
import { listTags } from "@/features/tags/queries";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("tags") };
}

export default async function TagsSettingsPage() {
  const ctx = await requirePagePermission("settings.catalogs");
  return <TagsTable tags={await listTags(ctx.membership.orgId)} />;
}
