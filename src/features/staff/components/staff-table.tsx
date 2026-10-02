"use client";

import { Plus, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import type { StaffRow } from "../queries";
import { type StaffOptions, StaffSheet } from "./staff-sheet";

export function StaffTable({
  staff,
  options,
  allBranchNames,
}: {
  staff: StaffRow[];
  options: StaffOptions;
  /** Barcha filiallar nomlari (nofaollari ham) — ro'yxatda ko'rsatish uchun */
  allBranchNames: Record<string, string>;
}) {
  const t = useTranslations("settings.staff");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus />
          {t("add")}
        </Button>
      </div>

      {staff.length === 0 ? (
        <EmptyState icon={UserRound} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fullName")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("phone")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("branches")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s) => (
                <TableRow
                  key={s.id}
                  className={cn("cursor-pointer", !s.isActive && "opacity-60")}
                  onClick={() => {
                    setEditing(s);
                    setOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {s.fullName || "—"}
                    {s.isTeacher && (
                      <Badge variant="outline" className="ml-2">
                        {t("teacherBadge")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {s.phone ? formatPhone(s.phone) : "—"}
                  </TableCell>
                  <TableCell>{s.roleName}</TableCell>
                  <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">
                    {s.allBranches
                      ? t("allBranches")
                      : s.branchIds
                          .map((id) => allBranchNames[id])
                          .filter(Boolean)
                          .join(", ") || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={s.isActive ? "secondary" : "outline"}>
                      {s.isActive ? t("activeBadge") : t("inactiveBadge")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StaffSheet open={open} onOpenChange={setOpen} staff={editing} options={options} />
    </div>
  );
}
