import { Construction } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { requirePagePermission } from "@/lib/auth";

import { NAV_ITEMS, type NavKey } from "../nav";

/** Bo'limlar hali yo'q. Har bo'lim o'z bosqichida haqiqiy sahifa bilan almashtiriladi. */
export async function SectionPlaceholder({ section }: { section: Exclude<NavKey, "settings"> }) {
  await requirePagePermission(NAV_ITEMS.find((i) => i.key === section)!.permissions);
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
