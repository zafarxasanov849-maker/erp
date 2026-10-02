import { forbidden } from "next/navigation";

import { AppShell } from "@/features/shell/components/app-shell";
import { ALL_BRANCHES, NAV_ITEMS } from "@/features/shell/nav";
import { canAny, getOrgContext } from "@/lib/auth";

export default async function BranchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const ctx = await getOrgContext();
  const { membership, profile, branches } = ctx;

  // Filialga kirish: "all" — faqat barcha filiallarga biriktirilganlar; aks holda o'z filiallari.
  const allowedBranch =
    branchId === ALL_BRANCHES ? membership.allBranches : branches.some((b) => b.id === branchId);
  if (!allowedBranch) forbidden();

  const allowed = NAV_ITEMS.filter((i) => canAny(ctx, i.permissions)).map((i) => i.key);

  return (
    <AppShell
      branchId={branchId}
      branches={branches}
      allowed={allowed}
      org={{ name: membership.orgName, logoUrl: membership.orgLogo, color: membership.orgColor }}
      user={{
        fullName: profile.fullName,
        roleName: membership.roleName,
        canSeeAllBranches: membership.allBranches,
        hasOtherOrgs: ctx.memberships.length > 1,
      }}
    >
      {children}
    </AppShell>
  );
}
