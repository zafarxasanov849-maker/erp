"use client";

import { MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslateKey } from "@/i18n/use-translate-key";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

import { setExpenseDeleted } from "../actions";
import { ExpenseDialog, type ExpenseFormOptions } from "./expense-dialog";

export interface ExpenseActionRow {
  id: string;
  branchId: string;
  amount: number;
  paidAt: string;
  categoryId: string;
  methodId: string | null;
  recipient: string | null;
  note: string | null;
  fromKassa: boolean;
}

export function ExpenseRowActions({
  row,
  options,
  canUpdate,
  canDelete,
  trash,
}: {
  row: ExpenseActionRow;
  options: ExpenseFormOptions;
  canUpdate: boolean;
  canDelete: boolean;
  trash: boolean;
}) {
  const t = useTranslations("expenses.actions");
  const tc = useTranslations("common");
  const tk = useTranslateKey();
  const router = useRouter();
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  function toggle(deleted: boolean) {
    start(async () => {
      const r = await setExpenseDeleted({ id: row.id, reason }, deleted);
      if (!r.ok) {
        toast.error(tk(r.error));
        return;
      }
      toast.success(deleted ? t("deleted") : t("restored"));
      setMode(null);
      router.refresh();
    });
  }

  if (trash) {
    return canDelete ? (
      <Button variant="outline" size="sm" disabled={pending} onClick={() => toggle(false)}>
        <RotateCcw />
        {t("restore")}
      </Button>
    ) : null;
  }
  if (!canUpdate && !canDelete) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={t("menu")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (
            <DropdownMenuItem onSelect={() => setMode("edit")}>
              <Pencil />
              {t("edit")}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem variant="destructive" onSelect={() => setMode("delete")}>
              <Trash2 />
              {t("delete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {mode === "edit" && (
        <ExpenseDialog
          options={options}
          onClose={() => setMode(null)}
          initial={{
            id: row.id,
            branchId: row.branchId,
            categoryId: row.categoryId,
            amount: row.amount,
            methodId: row.methodId ?? "",
            paidAt: formatDate(row.paidAt),
            recipient: row.recipient ?? "",
            note: row.note ?? "",
            fromKassa: row.fromKassa,
          }}
        />
      )}
      {mode === "delete" && (
        <Dialog open onOpenChange={(o) => !o && setMode(null)}>
          <DialogContent closeLabel={tc("close")}>
            <DialogHeader>
              <DialogTitle>
                {t("deleteTitle")}: {formatMoney(row.amount)}
              </DialogTitle>
              <DialogDescription>{t("deleteHint")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="expense-delete-reason">{t("reason")}</Label>
              <Input
                id="expense-delete-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMode(null)}>
                {tc("cancel")}
              </Button>
              <Button variant="destructive" disabled={pending} onClick={() => toggle(true)}>
                {t("deleteConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
