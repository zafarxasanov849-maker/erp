import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { VerifyForm } from "@/features/auth/components/verify-form";
import { otpPurposeSchema } from "@/features/auth/schema";
import { formatPhone, normalizePhone, toLocalPhoneInput } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("verifyTitle") };
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; purpose?: string }>;
}) {
  const params = await searchParams;
  const phone = normalizePhone(params.phone ?? "");
  const purpose = otpPurposeSchema.safeParse(params.purpose);
  if (!phone.ok || !purpose.success) redirect("/login");

  const t = await getTranslations("auth");
  return (
    <AuthShell
      title={t("verifyTitle")}
      description={t("verifyDescription", { phone: formatPhone(phone.phone) })}
    >
      <VerifyForm phone={toLocalPhoneInput(phone.phone)} purpose={purpose.data} />
    </AuthShell>
  );
}
