import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetForm } from "@/features/auth/components/reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle") };
}

export default async function ResetPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("resetTitle")} description={t("resetDescription")}>
      <ResetForm />
    </AuthShell>
  );
}
