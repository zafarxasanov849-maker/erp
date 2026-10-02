"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** Bo'lim ichidagi yorliqlar (Hisobotlar, Moliya). Faol — joriy yo'l bilan mos kelgani. */
export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b px-1 pb-px">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
