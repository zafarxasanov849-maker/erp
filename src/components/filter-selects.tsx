"use client";

import { parseAsString, useQueryStates } from "nuqs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANY = "__any";

export interface FilterSelect {
  /** URL parametri */
  key: string;
  label: string;
  anyLabel: string;
  items: { id: string; name: string }[];
}

/** Ro'yxat filtrlari (URL'da, nuqs). Server sahifasi qiymatlarni o'zi tekshiradi. */
export function FilterSelects({ filters }: { filters: FilterSelect[] }) {
  const [params, setParams] = useQueryStates(
    Object.fromEntries(filters.map((f) => [f.key, parseAsString])),
    { shallow: false },
  );
  return (
    <div className="flex flex-wrap items-end gap-2">
      {filters.map((f) => (
        <div key={f.key} className="grid gap-1">
          <span className="text-xs text-muted-foreground" id={`filter-${f.key}`}>
            {f.label}
          </span>
          <Select
            value={params[f.key] ?? ANY}
            onValueChange={(v) => void setParams({ [f.key]: v === ANY ? null : v })}
          >
            <SelectTrigger size="sm" className="min-w-40" aria-labelledby={`filter-${f.key}`}>
              <SelectValue>
                {f.items.find((i) => i.id === params[f.key])?.name ?? f.anyLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{f.anyLabel}</SelectItem>
              {f.items.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
