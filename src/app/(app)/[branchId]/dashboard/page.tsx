import { Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { AdminDashboard } from "@/features/dashboard/components/admin-dashboard";
import { LeaderDashboard } from "@/features/dashboard/components/leader-dashboard";
import { TeacherDashboard } from "@/features/dashboard/components/teacher-dashboard";
import { ALL_BRANCHES } from "@/features/shell/nav";
import { requirePagePermission } from "@/lib/auth";
import { formatDate, todayInTashkent } from "@/lib/dates";
import { dashboardKind } from "@/lib/metrics/dashboard-kind";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

/** Bosh sahifa — rolga qarab (tasdiqlangan A-qoida, lib/metrics/dashboard-kind.ts). */
export default async function DashboardPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const ctx = await requirePagePermission("dashboard.view");
  const t = await getTranslations("dashboard");
  const today = todayInTashkent();
  const branch = branchId === ALL_BRANCHES ? null : branchId;
  const base = `/${branchId}`;
  const kind = dashboardKind(ctx.membership);
  const firstName = ctx.profile.fullName.split(" ")[0] ?? ctx.profile.fullName;

  return (
    <div className="space-y-6" data-dashboard={kind}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("greeting", { name: firstName })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(`subtitle.${kind}`, { date: formatDate(today) })}
        </p>
      </div>
      {kind === "leader" && (
        <LeaderDashboard ctx={ctx} branchId={branch} base={base} today={today} />
      )}
      {kind === "admin" && <AdminDashboard ctx={ctx} branchId={branch} base={base} today={today} />}
      {kind === "teacher" && <TeacherDashboard ctx={ctx} base={base} today={today} />}
      {kind === "sales" && (
        <EmptyState icon={Target} title={t("sales.title")} description={t("sales.description")} />
      )}
      {kind === "basic" && (
        <EmptyState icon={Sparkles} title={t("basic.title")} description={t("basic.description")} />
      )}
    </div>
  );
}
