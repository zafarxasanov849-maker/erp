"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ALL_BRANCHES } from "../nav";
import type { ShellBranch } from "../types";

export function BranchSwitcher({
  branchId,
  branches,
  canSeeAll,
}: {
  branchId: string;
  branches: readonly ShellBranch[];
  canSeeAll: boolean;
}) {
  const t = useTranslations("branch");
  const router = useRouter();
  const pathname = usePathname();

  const current =
    branchId === ALL_BRANCHES ? t("all") : branches.find((b) => b.id === branchId)?.name;

  function select(id: string) {
    // /<eski>/students/... → /<yangi>/students/...
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${id}/${rest || "dashboard"}`);
  }

  const options = [...(canSeeAll ? [{ id: ALL_BRANCHES, name: t("all") }] : []), ...branches];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="max-w-56 justify-between" aria-label={t("switch")}>
          <Building2 className="text-muted-foreground" />
          <span className="truncate">{current}</span>
          <ChevronsUpDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((b) => (
          <DropdownMenuItem key={b.id} onSelect={() => select(b.id)}>
            <span className="flex-1 truncate">{b.name}</span>
            {b.id === branchId && <Check />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
