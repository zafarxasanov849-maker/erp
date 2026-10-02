import type { CSSProperties, ReactNode } from "react";

import {
  AddStudentButton,
  StudentSheetProvider,
} from "@/features/students/components/student-sheet";

import type { NavKey } from "../nav";
import type { ShellBranch, ShellUser } from "../types";
import { BranchSwitcher } from "./branch-switcher";
import { Brand } from "./brand";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { UserMenu } from "./user-menu";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function AppShell({
  branchId,
  branches,
  user,
  org,
  allowed,
  canCreateStudent,
  children,
}: {
  branchId: string;
  branches: readonly ShellBranch[];
  user: ShellUser;
  org: { name: string; logoUrl: string | null; color: string | null };
  allowed: readonly NavKey[];
  /** students.create — header'da "+ Talaba" tugmasi */
  canCreateStudent: boolean;
  children: ReactNode;
}) {
  // Markaz rangi (Sozlamalar → Markaz) asosiy rang sifatida
  const style =
    org.color && HEX_COLOR.test(org.color)
      ? ({
          "--primary": org.color,
          "--sidebar-primary": org.color,
          "--ring": org.color,
        } as CSSProperties)
      : undefined;

  return (
    <StudentSheetProvider branchId={branchId} enabled={canCreateStudent}>
      <div className="flex min-h-dvh" style={style}>
        <aside
          data-testid="sidebar"
          className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-4 border-r bg-sidebar p-3 text-sidebar-foreground md:flex print:hidden"
        >
          <div className="flex h-10 items-center">
            <Brand name={org.name} logoUrl={org.logoUrl} />
          </div>
          <NavLinks branchId={branchId} allowed={allowed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6 print:hidden">
            <MobileNav branchId={branchId} allowed={allowed} orgName={org.name} />
            <BranchSwitcher
              branchId={branchId}
              branches={branches}
              canSeeAll={user.canSeeAllBranches}
            />
            <div className="ml-auto flex items-center gap-2">
              <AddStudentButton />
              <UserMenu user={user} />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 print:p-0">{children}</main>
        </div>
      </div>
    </StudentSheetProvider>
  );
}
