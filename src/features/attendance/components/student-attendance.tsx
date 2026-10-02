import { CalendarCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { ATTENDANCE_STATUSES, summarize } from "@/lib/attendance";
import { formatDate } from "@/lib/dates";

import type { StudentAttendanceRow } from "../queries";
import { MarkBadge } from "./mark-cell";

/** Talaba profili → Davomat: guruhlar bo'yicha oxirgi 3 oy */
export function StudentAttendance({ rows }: { rows: StudentAttendanceRow[] }) {
  const t = useTranslations("attendance");
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title={t("profile.emptyTitle")}
        description={t("profile.emptyDescription")}
      />
    );
  }

  const groups = new Map<string, { name: string; rows: StudentAttendanceRow[] }>();
  for (const r of rows) {
    const g = groups.get(r.groupId) ?? { name: r.groupName, rows: [] };
    g.rows.push(r);
    groups.set(r.groupId, g);
  }

  return (
    <div className="grid gap-4" data-testid="student-attendance">
      <p className="text-sm text-muted-foreground">{t("profile.period")}</p>
      {[...groups.entries()].map(([id, g]) => {
        const sum = summarize(g.rows.map((r) => r.status));
        const total = g.rows.length;
        const percent = Math.round(((sum.present + sum.late) / total) * 100);
        return (
          <section key={id} className="grid gap-3 rounded-lg border p-3" data-group={g.name}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{g.name}</h3>
              <span className="text-sm text-muted-foreground">
                {t("profile.rate", { percent })}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {ATTENDANCE_STATUSES.map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <MarkBadge status={s} className="size-6 text-[10px]" />
                  {t(`statuses.${s}`)}: <span className="font-medium tabular-nums">{sum[s]}</span>
                </span>
              ))}
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {g.rows.map((r) => (
                <li
                  key={`${r.date}-${r.startTime}`}
                  className="flex flex-col items-center gap-0.5"
                  title={`${formatDate(r.date)} ${r.startTime} — ${t(`statuses.${r.status}`)}`}
                >
                  <MarkBadge status={r.status} late={r.lateMarked} />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatDate(r.date).slice(0, 5)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
