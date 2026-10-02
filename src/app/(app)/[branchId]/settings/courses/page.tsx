import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CoursesTable } from "@/features/courses/components/courses-table";
import { listCourses } from "@/features/courses/queries";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("courses") };
}

export default async function CoursesSettingsPage() {
  const ctx = await requirePagePermission("settings.catalogs");
  return <CoursesTable courses={await listCourses(ctx.membership.orgId)} />;
}
