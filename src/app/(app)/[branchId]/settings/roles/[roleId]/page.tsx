import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { RoleEditor } from "@/features/roles/components/role-editor";
import { getRole } from "@/features/roles/queries";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.roles");
  return { title: t("edit") };
}

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ branchId: string; roleId: string }>;
}) {
  const { branchId, roleId } = await params;
  const ctx = await requirePagePermission("settings.roles");
  const role = /^[0-9a-f-]{36}$/i.test(roleId) ? await getRole(ctx.membership.orgId, roleId) : null;
  if (!role) notFound();

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">{role.name}</h2>
      <RoleEditor
        role={{
          id: role.id,
          name: role.name,
          description: role.description ?? "",
          permissions: role.permissions,
          isSystem: role.is_system,
          isOwner: role.system_key === "owner",
        }}
        grantable={ctx.membership.permissions}
        listPath={`/${branchId}/settings/roles`}
      />
    </div>
  );
}
