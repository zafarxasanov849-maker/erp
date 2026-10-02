"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { formatLocalPhoneInput } from "@/lib/phone";

/**
 * Telefon: "+998" prefiksi va "90 123 45 67" maskasi. Qiymat — mahalliy qism ("90 123 45 67");
 * serverda normalizePhone() bilan +998XXXXXXXXX ga aylantiriladi.
 */
function PhoneInput({
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
      <span className="border-r px-3 text-sm text-muted-foreground select-none">+998</span>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="90 123 45 67"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        value={value}
        onChange={(e) => onChange(formatLocalPhoneInput(e.target.value))}
        {...props}
      />
    </div>
  );
}

export { PhoneInput };
