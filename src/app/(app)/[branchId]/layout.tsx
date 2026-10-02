import { notFound } from "next/navigation";

import { AppShell } from "@/features/shell/components/app-shell";
import { MOCK_BRANCHES, MOCK_USER } from "@/features/shell/mock";
import { ALL_BRANCHES } from "@/features/shell/nav";

export default async function BranchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;

  // 1-bosqichda: can_see_branch() bilan tekshiriladi va ruxsat yo'q bo'lsa 403 sahifa.
  const known =
    (branchId === ALL_BRANCHES && MOCK_USER.canSeeAllBranches) ||
    MOCK_BRANCHES.some((b) => b.id === branchId);
  if (!known) notFound();

  return (
    <AppShell branchId={branchId} branches={MOCK_BRANCHES} user={MOCK_USER}>
      {children}
    </AppShell>
  );
}
