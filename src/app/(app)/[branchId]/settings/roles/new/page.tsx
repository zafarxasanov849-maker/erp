import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RoleEditor } from "@/features/roles/components/role-editor";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.roles");
  return { title: t("add") };
}

export default async function NewRolePage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("settings.roles");
  const t = await getTranslations("settings.roles");
  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">{t("add")}</h2>
      <RoleEditor
        role={null}
        grantable={ctx.membership.permissions}
        listPath={`/${branchId}/settings/roles`}
      />
    </div>
  );
}
