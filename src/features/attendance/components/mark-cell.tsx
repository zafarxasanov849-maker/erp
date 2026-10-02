"use client";

import { useTranslations } from "next-intl";

import type { AttendanceStatus, Mark } from "@/lib/attendance";
import { cn } from "@/lib/utils";

export const MARK_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500 text-white border-emerald-600",
  late: "bg-amber-400 text-amber-950 border-amber-500",
  absent: "bg-red-500 text-white border-red-600",
  excused: "bg-sky-500 text-white border-sky-600",
};

/** Rang + harf (K, Kch, Y, S) — rang ko'rmaydiganlar uchun ham tushunarli */
export function MarkBadge({
  status,
  className,
  late,
}: {
  status: Mark;
  className?: string;
  /** Kechikib belgilangan — burchakda nuqta */
  late?: boolean;
}) {
  const t = useTranslations("attendance");
  return (
    <span
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-md border text-xs font-semibold select-none",
        status
          ? MARK_STYLES[status]
          : "border-dashed border-input bg-background text-muted-foreground",
        className,
      )}
      title={status ? t(`statuses.${status}`) : undefined}
    >
      {status ? t(`short.${status}`) : ""}
      {late && (
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full border border-background bg-foreground" />
      )}
    </span>
  );
}
