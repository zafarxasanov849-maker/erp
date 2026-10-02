import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { OnboardingForm } from "@/features/auth/components/onboarding-form";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getAuthUser, getProfile } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("onboardingTitle") };
}

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  const t = await getTranslations("auth");
  const meta = user.user_metadata as { org_name?: string; full_name?: string };

  return (
    <AuthShell
      title={t("onboardingTitle")}
      description={t("onboardingDescription")}
      footer={<SignOutButton />}
    >
      <OnboardingForm
        defaults={{
          orgName: meta.org_name ?? "",
          fullName: profile?.fullName || meta.full_name || "",
          branchName: "",
        }}
      />
    </AuthShell>
  );
}
