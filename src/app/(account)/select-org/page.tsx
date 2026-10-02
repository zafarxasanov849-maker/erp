import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SelectOrgList } from "@/features/auth/components/select-org-list";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getAuthUser, getMemberships } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("selectOrgTitle") };
}

export default async function SelectOrgPage() {
  if (!(await getAuthUser())) redirect("/login");
  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/onboarding");
  const t = await getTranslations("auth");

  return (
    <AuthShell
      title={t("selectOrgTitle")}
      description={t("selectOrgDescription")}
      footer={<SignOutButton />}
    >
      <div className="grid gap-4">
        <SelectOrgList
          items={memberships.map(({ orgId, orgName, roleName }) => ({ orgId, orgName, roleName }))}
        />
        <Button asChild variant="outline">
          <Link href="/onboarding">
            <Plus />
            {t("newOrg")}
          </Link>
        </Button>
      </div>
    </AuthShell>
  );
}
