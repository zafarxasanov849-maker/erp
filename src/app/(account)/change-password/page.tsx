import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { getProfile } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("changePasswordTitle") };
}

export default async function ChangePasswordPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("changePasswordTitle")}
      description={
        profile.mustChangePassword ? t("changePasswordTemp") : t("changePasswordDescription")
      }
      footer={<SignOutButton />}
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
