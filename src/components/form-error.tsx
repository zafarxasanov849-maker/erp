"use client";

import { CircleAlert } from "lucide-react";

import { useTranslateKey } from "@/i18n/use-translate-key";

/** Formaning umumiy xatosi (server action'dan kelgan kalit). */
export function FormError({ error }: { error?: string | null }) {
  const tk = useTranslateKey();
  if (!error) return null;
  return (
    <p
      role="alert"
      data-testid="form-error"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      {tk(error)}
    </p>
  );
}
