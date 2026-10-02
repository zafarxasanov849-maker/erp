import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { DayLesson } from "@/features/attendance/queries";
import { cn } from "@/lib/utils";

/** Bugungi jadval (ixcham): vaqt, guruh, ustoz, belgilash holati. */
export async function DayLessonList({ lessons, base }: { lessons: DayLesson[]; base: string }) {
  const t = await getTranslations("attendance.today");
  return (
    <ul className="divide-y" data-testid="dashboard-lessons">
      {lessons.map((l) => {
        const cancelled = l.status === "cancelled";
        const complete = l.members > 0 && l.marked >= l.members;
        const content = (
          <>
            <span className="w-24 shrink-0 text-sm text-muted-foreground tabular-nums">
              {l.start_time}–{l.end_time}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate font-medium", cancelled && "line-through")}>
                {l.group_name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {[l.teacher_name ?? t("noTeacher"), l.room_name].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                cancelled
                  ? "text-muted-foreground"
                  : complete
                    ? "text-emerald-700 dark:text-emerald-400"
                    : l.marked > 0
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-red-700 dark:text-red-400",
              )}
            >
              {cancelled
                ? t("cancelled")
                : l.marked === 0
                  ? t("notMarked")
                  : t("marked", { marked: l.marked, members: l.members })}
            </span>
          </>
        );
        return (
          <li key={l.lesson_id}>
            {cancelled ? (
              <div className="flex items-center gap-3 py-2">{content}</div>
            ) : (
              <Link
                href={`${base}/lessons/${l.lesson_id}`}
                className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50"
              >
                {content}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
