"use client";

import { Clock } from "lucide-react";
import * as React from "react";

import { formatTimeInput } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Vaqt: doim 24 soatlik "SS:dd" (CLAUDE.md qoida 7), brauzerning AM/PM formatisiz. */
function TimeInput({
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
      <Clock className="ml-3 size-4 shrink-0 text-muted-foreground" />
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="SS:dd"
        maxLength={5}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-base tabular-nums outline-none placeholder:text-muted-foreground md:text-sm"
        value={value}
        onChange={(e) => onChange(formatTimeInput(e.target.value))}
        {...props}
      />
    </div>
  );
}

export { TimeInput };
