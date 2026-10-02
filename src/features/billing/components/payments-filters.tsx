"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { paymentsSearchParams } from "../payments-search-params";

const ANY = "__any";

export function PaymentsFilters({
  methods,
  staff,
}: {
  methods: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const t = useTranslations("billing.payments");
  const [params, setParams] = useQueryStates(paymentsSearchParams, { shallow: false });
  const select = (
    key: "method" | "staff",
    label: string,
    anyLabel: string,
    items: { id: string; name: string }[],
  ) => (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground" id={`pf-${key}`}>
        {label}
      </span>
      <Select
        value={params[key] ?? ANY}
        onValueChange={(v) => void setParams({ [key]: v === ANY ? null : v })}
      >
        <SelectTrigger size="sm" className="min-w-40" aria-labelledby={`pf-${key}`}>
          <SelectValue>{items.find((i) => i.id === params[key])?.name ?? anyLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{anyLabel}</SelectItem>
          {items.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {i.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  return (
    <div className="flex flex-wrap items-end gap-2">
      {select("method", t("method"), t("allMethods"), methods)}
      {select("staff", t("staff"), t("allStaff"), staff)}
    </div>
  );
}
