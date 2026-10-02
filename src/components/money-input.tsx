"use client";

import * as React from "react";

import { formatMoney, parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Pul kiritish: yozayotganda "1 250 000" ko'rinishiga keladi, qiymat — butun so'm (number | null).
 * Manfiy summa kiritilmaydi (narxlar, to'lovlar).
 */
function MoneyInput({
  className,
  value,
  onChange,
  currencyLabel = "so'm",
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null;
  onChange: (value: number | null) => void;
  currencyLabel?: string;
}) {
  const display = value === null ? "" : formatMoney(value, { currency: false });
  return (
    <div
      className={cn(
        "flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-[[aria-invalid=true]]:border-destructive dark:bg-input/30",
        className,
      )}
    >
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-right text-base tabular-nums outline-none placeholder:text-muted-foreground md:text-sm"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
          onChange(digits === "" ? null : parseMoney(digits));
        }}
        {...props}
      />
      <span className="border-l px-3 text-sm text-muted-foreground select-none">
        {currencyLabel}
      </span>
    </div>
  );
}

export { MoneyInput };
