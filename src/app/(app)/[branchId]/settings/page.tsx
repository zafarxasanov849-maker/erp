import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SectionPlaceholder } from "@/features/shell/components/section-placeholder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("settings") };
}

export default function Page() {
  return <SectionPlaceholder section="settings" />;
}
