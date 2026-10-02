import { forbidden, redirect } from "next/navigation";

import { SETTINGS_SECTIONS } from "@/features/settings/sections";
import { can, getOrgContext } from "@/lib/auth";

export default async function SettingsIndex({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const ctx = await getOrgContext();
  const first = SETTINGS_SECTIONS.find((s) => can(ctx, s.permission));
  if (!first) forbidden();
  redirect(`/${branchId}/settings/${first.key}`);
}
