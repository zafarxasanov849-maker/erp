"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WEEKDAYS } from "@/lib/schedule";

const ANY = "__any__";

/** Filtrlar URL'da saqlanadi (sahifani yangilasa yoki havolani yuborsa ham qoladi). */
export function GroupFilters({
  courses,
  teachers,
}: {
  courses: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
}) {
  const t = useTranslations("groups.filters");
  const tw = useTranslations("weekdays");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value === ANY || value === "") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const select = (
    key: string,
    label: string,
    items: { value: string; label: string }[],
    anyLabel: string,
  ) => (
    <Select value={params.get(key) ?? ANY} onValueChange={(v) => set(key, v)}>
      <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-36" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{anyLabel}</SelectItem>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {select(
        "course",
        t("course"),
        courses.map((c) => ({ value: c.id, label: c.name })),
        t("allCourses"),
      )}
      {select(
        "teacher",
        t("teacher"),
        teachers.map((x) => ({ value: x.id, label: x.name })),
        t("allTeachers"),
      )}
      {select(
        "day",
        t("day"),
        WEEKDAYS.map((d) => ({ value: String(d), label: tw(`long.${d}`) })),
        t("allDays"),
      )}
      <Select
        value={params.get("status") ?? "active"}
        onValueChange={(v) => set("status", v === "active" ? ANY : v)}
      >
        <SelectTrigger size="sm" className="w-full sm:w-auto sm:min-w-36" aria-label={t("status")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">{t("active")}</SelectItem>
          <SelectItem value="finished">{t("finished")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
