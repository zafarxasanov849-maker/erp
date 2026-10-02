import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import type { EnrollmentStatus, StudentStatus } from "../schema";

const STYLES: Record<StudentStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  trial: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  frozen: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  left: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  new: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  archived: "border-zinc-500/30 bg-transparent text-muted-foreground",
};

const base =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

/** Talabaning umumiy holati (students_overview.status) */
export function StudentStatusBadge({
  status,
  className,
}: {
  status: StudentStatus;
  className?: string;
}) {
  const t = useTranslations("students.statuses");
  return <span className={cn(base, STYLES[status], className)}>{t(status)}</span>;
}

/** A'zolik holati: Sinovda / Faol / Muzlatilgan / Chiqqan */
export function EnrollmentStatusBadge({
  status,
  className,
}: {
  status: EnrollmentStatus;
  className?: string;
}) {
  const t = useTranslations("students.enrollmentStatuses");
  return <span className={cn(base, STYLES[status], className)}>{t(status)}</span>;
}
