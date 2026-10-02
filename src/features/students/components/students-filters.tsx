"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useEffect, useState, useTransition } from "react";

import { DateInput } from "@/components/date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, parseUiDate } from "@/lib/dates";

import { STUDENT_STATUSES } from "../schema";
import { hasStudentFilters, studentSearchParams } from "../search-params";

const ANY = "__any__";

interface Option {
  value: string;
  label: string;
}

/** Filtrlar URL'da (nuqs): sahifani yangilasa yoki havolani yuborsa ham saqlanadi. */
export function StudentsFilters({
  groups,
  courses,
  teachers,
  tags,
  branches,
}: {
  groups: Option[];
  courses: Option[];
  teachers: Option[];
  tags: Option[];
  /** Faqat "Barcha filiallar" rejimida */
  branches: Option[] | null;
}) {
  const t = useTranslations("students");
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useQueryStates(studentSearchParams, {
    shallow: false,
    startTransition,
  });
  const [search, setSearch] = useState(params.q);

  // Qidiruv: 300 ms kutib URL'ga yoziladi
  useEffect(() => {
    if (search === params.q) return;
    const timer = setTimeout(() => setParams({ q: search || null, page: null }), 300);
    return () => clearTimeout(timer);
  }, [search, params.q, setParams]);

  function set(patch: Partial<Record<keyof typeof studentSearchParams, string | null>>) {
    void setParams({ ...(patch as object), page: null });
  }

  const select = (
    key: "status" | "group" | "course" | "teacher" | "tag" | "branch",
    label: string,
    items: Option[],
    anyLabel: string,
  ) => (
    <Select value={params[key] ?? ANY} onValueChange={(v) => set({ [key]: v === ANY ? null : v })}>
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
    <div className="grid gap-2" data-pending={pending || undefined}>
      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 pl-9"
          placeholder={t("filters.search")}
          aria-label={t("filters.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {select(
          "status",
          t("filters.status"),
          STUDENT_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) })),
          t("filters.allStatuses"),
        )}
        {select("group", t("filters.group"), groups, t("filters.allGroups"))}
        {select("course", t("filters.course"), courses, t("filters.allCourses"))}
        {select("teacher", t("filters.teacher"), teachers, t("filters.allTeachers"))}
        {tags.length > 0 && select("tag", t("filters.tag"), tags, t("filters.allTags"))}
        {branches &&
          branches.length > 1 &&
          select("branch", t("filters.branch"), branches, t("filters.allBranches"))}
        <DateFilter
          label={t("filters.joinedFrom")}
          value={params.from}
          onChange={(v) => set({ from: v })}
        />
        <DateFilter
          label={t("filters.joinedTo")}
          value={params.to}
          onChange={(v) => set({ to: v })}
        />
        {hasStudentFilters(params) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              void setParams(null);
            }}
          >
            <X />
            {t("filters.reset")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** KK.OO.YYYY kiritiladi, to'liq sana bo'lganda URL'ga ISO yoziladi */
function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
}) {
  const [text, setText] = useState(value ? formatDate(value) : "");
  useEffect(() => setText(value ? formatDate(value) : ""), [value]);

  return (
    <DateInput
      className="h-8 w-full sm:w-40"
      aria-label={label}
      title={label}
      placeholder={label}
      value={text}
      onChange={(v) => {
        setText(v);
        if (v === "") onChange(null);
        else {
          const iso = parseUiDate(v);
          if (iso) onChange(iso);
        }
      }}
    />
  );
}
