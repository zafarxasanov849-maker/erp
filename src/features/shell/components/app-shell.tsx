import type { ReactNode } from "react";

import type { ShellBranch, ShellUser } from "../mock";
import { BranchSwitcher } from "./branch-switcher";
import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

export function AppShell({
  branchId,
  branches,
  user,
  children,
}: {
  branchId: string;
  branches: readonly ShellBranch[];
  user: ShellUser;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <aside
        data-testid="sidebar"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r bg-sidebar p-3 text-sidebar-foreground md:flex"
      >
        <div className="flex h-10 items-center">
          <Brand />
        </div>
        <NavLinks branchId={branchId} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <MobileNav branchId={branchId} />
          <BranchSwitcher
            branchId={branchId}
            branches={branches}
            canSeeAll={user.canSeeAllBranches}
          />
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
