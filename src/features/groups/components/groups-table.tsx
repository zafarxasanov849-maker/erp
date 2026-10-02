"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import type { Weekday } from "@/lib/schedule";
import { normalizeTime } from "@/lib/schedule";

import { formatTimeRange, formatWeekdays } from "../format";
import type { GroupListRow } from "../queries";

export function GroupsTable({
  groups,
  branchPath,
  showBranch,
}: {
  groups: GroupListRow[];
  branchPath: string;
  showBranch: boolean;
}) {
  const t = useTranslations("groups.list");
  const tw = useTranslations("weekdays");
  const router = useRouter();

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("course")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("teacher")}</TableHead>
            <TableHead>{t("schedule")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("room")}</TableHead>
            <TableHead className="hidden text-right sm:table-cell">{t("students")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("nextLesson")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <TableRow
              key={g.id}
              className="cursor-pointer"
              onClick={() => router.push(`${branchPath}/groups/${g.id}`)}
            >
              <TableCell className="font-medium">
                <Link
                  href={`${branchPath}/groups/${g.id}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {g.name}
                </Link>
                {showBranch && (
                  <span className="block text-xs text-muted-foreground">{g.branch?.name}</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">{g.course?.name}</TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {g.teacherName ?? "—"}
              </TableCell>
              <TableCell className="tabular-nums">
                <span className="block">
                  {formatWeekdays(g.weekdays, (d) => tw(`short.${d as Weekday}`))}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeRange(g.start_time, g.end_time)}
                </span>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {g.room?.name ?? "—"}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {g.studentCount}
              </TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                {g.nextLesson
                  ? `${formatDate(g.nextLesson.date)} ${normalizeTime(g.nextLesson.startTime)}`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
