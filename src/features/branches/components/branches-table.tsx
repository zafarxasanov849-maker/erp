"use client";

import { Building2, Plus } from "lucide-react";
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
import { formatPhone, toLocalPhoneInput } from "@/lib/phone";

import type { BranchRow } from "../queries";
import type { BranchValues } from "../schema";
import { BranchDialog } from "./branch-dialog";

export function BranchesTable({ branches }: { branches: BranchRow[] }) {
  const t = useTranslations("settings.branches");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BranchValues | null>(null);

  function openEdit(b: BranchRow) {
    setEditing({
      id: b.id,
      name: b.name,
      address: b.address ?? "",
      phone: toLocalPhoneInput(b.phone),
      isActive: b.is_active,
    });
    setOpen(true);
  }

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

      {branches.length === 0 ? (
        <EmptyState icon={Building2} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("address")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("phone")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => openEdit(b)}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {b.address || "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {b.phone ? formatPhone(b.phone) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.is_active ? "secondary" : "outline"}>
                      {b.is_active ? t("activeBadge") : t("inactiveBadge")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BranchDialog open={open} onOpenChange={setOpen} branch={editing} />
    </div>
  );
}
