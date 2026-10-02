"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, isoWeekday } from "@/lib/dates";
import type { Weekday } from "@/lib/schedule";
import { cn } from "@/lib/utils";

import { formatTimeRange } from "../format";

export interface LessonRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "held" | "cancelled";
  cancel_reason: string | null;
  topic: string | null;
}

export function LessonsList({ lessons, today }: { lessons: LessonRow[]; today: string }) {
  const t = useTranslations("groups.lessons");
  const tw = useTranslations("weekdays");

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("time")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("topic")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons.map((l) => (
            <TableRow
              key={l.id}
              data-status={l.status}
              className={cn(
                l.status === "cancelled" && "bg-muted/40 text-muted-foreground",
                l.date === today && "font-medium",
              )}
            >
              <TableCell className="tabular-nums">
                {formatDate(l.date)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {tw(`short.${isoWeekday(l.date) as Weekday}`)}
                </span>
              </TableCell>
              <TableCell className="tabular-nums">
                {formatTimeRange(l.start_time, l.end_time)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    l.status === "cancelled"
                      ? "outline"
                      : l.status === "held"
                        ? "secondary"
                        : "default"
                  }
                >
                  {t(`statuses.${l.status}`)}
                </Badge>
                {l.status === "cancelled" && l.cancel_reason && (
                  <span className="ml-2 text-xs">{l.cancel_reason}</span>
                )}
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {l.topic ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
