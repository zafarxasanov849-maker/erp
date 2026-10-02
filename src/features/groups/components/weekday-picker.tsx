"use client";

import { useTranslations } from "next-intl";

import { WEEKDAYS } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/** Du…Ya chiplari (ISO 1…7). */
export function WeekdayPicker({
  value,
  onChange,
  invalid,
}: {
  value: number[];
  onChange: (value: number[]) => void;
  invalid?: boolean;
}) {
  const t = useTranslations("weekdays");
  return (
    <div role="group" className="flex flex-wrap gap-1.5" data-invalid={invalid || undefined}>
      {WEEKDAYS.map((d) => {
        const on = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            title={t(`long.${d}`)}
            onClick={() =>
              onChange(on ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => a - b))
            }
            className={cn(
              "h-9 min-w-11 rounded-md border px-2 text-sm font-medium transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent",
              invalid && !on && "border-destructive",
            )}
          >
            {t(`short.${d}`)}
          </button>
        );
      })}
    </div>
  );
}
