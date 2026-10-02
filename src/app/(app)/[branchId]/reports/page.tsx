import { forbidden, redirect } from "next/navigation";

import { REPORT_PERMISSIONS } from "@/features/reports/access";
import { REPORT_KINDS } from "@/features/reports/search-params";
import { canAny, getOrgContext } from "@/lib/auth";

/** Hisobotlar → ruxsat bor birinchi hisobot */
export default async function ReportsIndex({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const ctx = await getOrgContext();
  const first = REPORT_KINDS.find((k) => canAny(ctx, REPORT_PERMISSIONS[k]));
  if (!first) forbidden();
  redirect(`/${branchId}/reports/${first}`);
}
