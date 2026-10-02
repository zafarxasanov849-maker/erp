import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { listBranches } from "@/features/branches/queries";
import { RoomsTable } from "@/features/rooms/components/rooms-table";
import { listRooms } from "@/features/rooms/queries";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { requirePagePermission } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.sections");
  return { title: t("rooms") };
}

export default async function RoomsSettingsPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("settings.catalogs");
  const orgId = ctx.membership.orgId;
  const [rooms, branches] = await Promise.all([listRooms(orgId), listBranches(orgId)]);
  const active = branches.filter((b) => b.is_active).map((b) => ({ id: b.id, name: b.name }));
  return (
    <RoomsTable
      rooms={rooms}
      branches={active}
      defaultBranchId={branchId === ALL_BRANCHES ? null : branchId}
    />
  );
}
