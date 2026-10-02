import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Separator } from "@/components/ui/separator";
import { LogoUpload } from "@/features/organization/components/logo-upload";
import { OrganizationForm } from "@/features/organization/components/organization-form";
import { getOrganization } from "@/features/organization/queries";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("organization") };
}

export default async function OrganizationSettingsPage() {
  const ctx = await requirePagePermission("settings.organization");
  const org = await getOrganization(ctx.membership.orgId);

  return (
    <div className="grid gap-6">
      <LogoUpload logoUrl={org.logo_url} />
      <Separator className="max-w-lg" />
      <OrganizationForm
        defaults={{
          name: org.name,
          primaryColor: org.primary_color ?? "#2563eb",
          workStart: (org.work_start ?? "08:00").slice(0, 5),
          workEnd: (org.work_end ?? "22:00").slice(0, 5),
        }}
      />
    </div>
  );
}
