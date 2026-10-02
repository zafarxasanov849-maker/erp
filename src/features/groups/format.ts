import { normalizeTime } from "@/lib/schedule";

/** "Du, Ch, Ju" — tarjima funksiyasi weekdays.short.N ni beradi. */
export function formatWeekdays(
  weekdays: readonly number[],
  short: (day: number) => string,
): string {
  return [...weekdays]
    .sort((a, b) => a - b)
    .map(short)
    .join(", ");
}

export function formatTimeRange(start: string, end: string): string {
  return `${normalizeTime(start)}–${normalizeTime(end)}`;
}
