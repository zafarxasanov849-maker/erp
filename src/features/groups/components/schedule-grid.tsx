import Link from "next/link";

import { toMinutes } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export interface ScheduleColumn {
  id: string;
  name: string;
}

export interface ScheduleBlock {
  id: string;
  name: string;
  columnId: string;
  startTime: string;
  endTime: string;
  subtitle: string;
}

const PX_PER_MIN = 1; // 60 px = 1 soat

/** Xonalar × vaqt panjarasi (bitta kun). Ichki gorizontal aylantirish — sahifa emas. */
export function ScheduleGrid({
  columns,
  blocks,
  workStart,
  workEnd,
  hrefFor,
}: {
  columns: ScheduleColumn[];
  blocks: ScheduleBlock[];
  workStart: string;
  workEnd: string;
  hrefFor: (blockId: string) => string;
}) {
  // Ish vaqtidan tashqaridagi guruhlar ham ko'rinsin
  const start =
    Math.floor(Math.min(toMinutes(workStart), ...blocks.map((b) => toMinutes(b.startTime))) / 60) *
    60;
  const end =
    Math.ceil(Math.max(toMinutes(workEnd), ...blocks.map((b) => toMinutes(b.endTime))) / 60) * 60;
  const hours = Array.from({ length: (end - start) / 60 }, (_, i) => start + i * 60);
  const height = (end - start) * PX_PER_MIN;

  return (
    <div className="overflow-x-auto rounded-lg border" data-testid="schedule-grid">
      <div
        className="grid min-w-fit"
        style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(9rem, 1fr))` }}
      >
        <div className="sticky left-0 z-10 border-r border-b bg-muted/50" />
        {columns.map((c) => (
          <div
            key={c.id}
            className="truncate border-b bg-muted/50 px-2 py-2 text-sm font-medium not-last:border-r"
          >
            {c.name}
          </div>
        ))}

        <div className="sticky left-0 z-10 border-r bg-background" style={{ height }}>
          {hours.map((h) => (
            <div
              key={h}
              className="relative border-b pr-1 text-right text-xs text-muted-foreground tabular-nums"
              style={{ height: 60 * PX_PER_MIN }}
            >
              <span className="relative -top-0.5">{`${String(h / 60).padStart(2, "0")}:00`}</span>
            </div>
          ))}
        </div>
        {columns.map((c) => (
          <div key={c.id} className="relative not-last:border-r" style={{ height }}>
            {hours.map((h) => (
              <div key={h} className="border-b border-dashed" style={{ height: 60 * PX_PER_MIN }} />
            ))}
            {blocks
              .filter((b) => b.columnId === c.id)
              .map((b) => {
                const top = (toMinutes(b.startTime) - start) * PX_PER_MIN;
                const h = (toMinutes(b.endTime) - toMinutes(b.startTime)) * PX_PER_MIN;
                return (
                  <Link
                    key={b.id}
                    href={hrefFor(b.id)}
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs hover:bg-primary/15",
                    )}
                    style={{ top, height: Math.max(h, 24) }}
                  >
                    <span className="block truncate font-semibold">{b.name}</span>
                    <span className="block truncate text-muted-foreground tabular-nums">
                      {b.startTime}–{b.endTime}
                    </span>
                    <span className="block truncate text-muted-foreground">{b.subtitle}</span>
                  </Link>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
