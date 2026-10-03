"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action";

/** Sabab majburiy bo'lgan bekor qilish (pul topshirish, ish haqi yozuvi). */
export function ReasonDialog({
  title,
  description,
  confirmLabel,
  doneMessage,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  doneMessage: string;
  onConfirm: (reason: string) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!reason.trim()) {
      setError("validation.reasonText");
      return;
    }
    start(async () => {
      const r = await onConfirm(reason.trim());
      if (!r.ok) {
        setError(r.error);
        return;
      }
      toast.success(doneMessage);
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tc("close")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="void-reason">{tv("reasonLabel")}</Label>
          <Input
            id="void-reason"
            autoFocus
            value={reason}
            aria-invalid={error === "validation.reasonText" || undefined}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <FormError error={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" disabled={pending} onClick={submit}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
