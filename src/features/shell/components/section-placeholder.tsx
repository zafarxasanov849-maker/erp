import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";

import type { NavKey } from "../nav";

/** 0-bosqich: bo'limlar hali yo'q. Har bo'lim o'z bosqichida haqiqiy sahifa bilan almashtiriladi. */
export async function SectionPlaceholder({ section }: { section: NavKey }) {
  const t = await getTranslations();
  const title = t(`nav.${section}`);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <EmptyState
        icon={Construction}
        title={t("placeholder.title")}
        description={t("placeholder.description", { section: title })}
      />
    </div>
  );
}
