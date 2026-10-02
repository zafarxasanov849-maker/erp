"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import type { NavKey } from "../nav";
import { NavLinks } from "./nav-links";

export function MobileNav({
  branchId,
  allowed,
  orgName,
}: {
  branchId: string;
  allowed: readonly NavKey[];
  orgName: string;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("common.openMenu")}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-sidebar p-0" closeLabel={t("common.close")}>
        <SheetHeader className="border-b">
          <SheetTitle className="truncate pr-6">{orgName}</SheetTitle>
        </SheetHeader>
        <div className="p-3">
          <NavLinks branchId={branchId} allowed={allowed} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
