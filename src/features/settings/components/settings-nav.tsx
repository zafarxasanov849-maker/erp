"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { SettingsSection } from "../sections";

export function SettingsNav({
  branchId,
  sections,
}: {
  branchId: string;
  sections: readonly SettingsSection[];
}) {
  const t = useTranslations("settings.sections");
  const active = useSelectedLayoutSegment();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 pb-px">
      {sections.map((key) => (
        <Link
          key={key}
          href={`/${branchId}/settings/${key}`}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
            active === key && "border-primary text-foreground",
          )}
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
