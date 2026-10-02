"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { NAV_ITEMS, type NavKey } from "../nav";

export function NavLinks({
  branchId,
  allowed,
  onNavigate,
}: {
  branchId: string;
  allowed: readonly NavKey[];
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  // [branchId] layout'idan keyingi segment: "dashboard", "students", ...
  const active = useSelectedLayoutSegment();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((i) => allowed.includes(i.key)).map(({ key, segment, icon: Icon }) => {
        const isActive = active === segment;
        return (
          <Link
            key={key}
            href={`/${branchId}/${segment}`}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive && "bg-sidebar-accent text-sidebar-primary",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
