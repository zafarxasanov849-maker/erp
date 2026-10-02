import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getOrgContext } from "@/lib/auth";

// Kirgan foydalanuvchini birinchi filialiga yo'naltiradi.
export default async function Home() {
  const ctx = await getOrgContext();
  const first = ctx.branches[0];
  if (first) redirect(`/${first.id}/dashboard`);

  const t = await getTranslations("access");
  return (
    <AuthShell title={ctx.membership.orgName} footer={<SignOutButton />}>
      <EmptyState title={t("noBranchTitle")} description={t("noBranchDescription")} />
    </AuthShell>
  );
}
