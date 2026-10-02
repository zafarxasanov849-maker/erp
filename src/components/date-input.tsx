"use client";

import { CalendarDays } from "lucide-react";
import * as React from "react";

import { formatUiDateInput } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Sana: doim KK.OO.YYYY (CLAUDE.md qoida 7) — brauzer tilidan qat'i nazar.
 * Qiymat — formadagi matn ("02.10.2026"); serverda parseUiDate() bilan ISO ga aylantiriladi.
 */
function DateInput({
  className,
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-[[aria-invalid=true]]:border-destructive dark:bg-input/30",
        className,
      )}
    >
      <CalendarDays className="ml-3 size-4 shrink-0 text-muted-foreground" />
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="KK.OO.YYYY"
        maxLength={10}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-base tabular-nums outline-none placeholder:text-muted-foreground md:text-sm"
        value={value}
        onChange={(e) => onChange(formatUiDateInput(e.target.value))}
        {...props}
      />
    </div>
  );
}

export { DateInput };
