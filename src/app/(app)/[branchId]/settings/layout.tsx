import { getTranslations } from "next-intl/server";

import { SettingsNav } from "@/features/settings/components/settings-nav";
import { SETTINGS_SECTIONS } from "@/features/settings/sections";
import { SETTINGS_PERMISSIONS } from "@/features/shell/nav";
import { can, requirePagePermission } from "@/lib/auth";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission(SETTINGS_PERMISSIONS);
  const t = await getTranslations("nav");
  const sections = SETTINGS_SECTIONS.filter((s) => can(ctx, s.permission)).map((s) => s.key);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings")}</h1>
      <SettingsNav branchId={branchId} sections={sections} />
      {children}
    </div>
  );
}
