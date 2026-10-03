"use client";

import { useTranslations } from "next-intl";

import { FilterSelects } from "@/components/filter-selects";

export function PaymentsFilters({
  methods,
  staff,
}: {
  methods: { id: string; name: string }[];
  staff: { id: string; name: string }[];
}) {
  const t = useTranslations("billing.payments");
  return (
    <FilterSelects
      filters={[
        { key: "method", label: t("method"), anyLabel: t("allMethods"), items: methods },
        { key: "staff", label: t("staff"), anyLabel: t("allStaff"), items: staff },
      ]}
    />
  );
}
