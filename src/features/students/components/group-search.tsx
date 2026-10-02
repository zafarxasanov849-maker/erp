"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { formatWeekdays } from "@/features/groups/format";
import type { Weekday } from "@/lib/schedule";

import type { EnrollableGroup } from "../form-data";

/** Kurs · ustoz · kunlar · vaqt · xona */
export function GroupMeta({ group }: { group: EnrollableGroup }) {
  const tw = useTranslations("weekdays");
  const parts = [
    group.courseName,
    group.teacherName,
    `${formatWeekdays(group.weekdays, (d) => tw(`short.${d as Weekday}`))} ${group.startTime}–${group.endTime}`,
    group.roomName,
  ].filter(Boolean);
  return <span className="text-xs text-muted-foreground">{parts.join(" · ")}</span>;
}

export function GroupSearch({
  groups,
  excludeIds = [],
  branchId,
  onPick,
}: {
  groups: readonly EnrollableGroup[];
  excludeIds?: readonly string[];
  /** Shu filial guruhlari birinchi ko'rsatiladi */
  branchId?: string;
  onPick: (group: EnrollableGroup) => void;
}) {
  const t = useTranslations("students.sheet");
  const [query, setQuery] = useState("");
  const showBranch = new Set(groups.map((g) => g.branchId)).size > 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return groups
      .filter((g) => !excludeIds.includes(g.id))
      .filter(
        (g) =>
          !q ||
          [g.name, g.courseName, g.teacherName ?? "", g.roomName ?? ""].some((s) =>
            s.toLocaleLowerCase().includes(q),
          ),
      )
      .sort((a, b) => Number(b.branchId === branchId) - Number(a.branchId === branchId));
  }, [groups, excludeIds, query, branchId]);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noGroups")}</p>;
  }

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t("searchGroup")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("searchGroup")}
        />
      </div>
      <ul className="max-h-56 overflow-y-auto rounded-md border" data-testid="group-search-results">
        {filtered.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            {t("noGroupsFound")}
          </li>
        ) : (
          filtered.map((g) => (
            <li key={g.id} className="border-b last:border-b-0">
              <button
                type="button"
                className="grid w-full gap-0.5 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                onClick={() => onPick(g)}
              >
                <span className="text-sm font-medium">
                  {g.name}
                  {showBranch && (
                    <span className="font-normal text-muted-foreground"> · {g.branchName}</span>
                  )}
                </span>
                <GroupMeta group={g} />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
