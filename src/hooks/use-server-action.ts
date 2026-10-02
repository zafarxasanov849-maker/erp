"use client";

import { useCallback, useState, useTransition } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

type Result<T> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Server Action'ni chaqirish: pending holati, umumiy xato va maydon xatolarini formaga qo'yish.
 * redirect() qilgan action natija qaytarmaydi — u holda hech narsa qilinmaydi.
 */
export function useServerAction<V extends FieldValues = FieldValues>(form?: UseFormReturn<V>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = useCallback(
    <T>(fn: () => Promise<Result<T> | undefined | void>, onSuccess?: (data: T) => void) => {
      startTransition(async () => {
        setError(null);
        const result = await fn();
        if (!result) return;
        if (result.ok) {
          onSuccess?.(result.data);
          return;
        }
        setError(result.error);
        if (form && result.fieldErrors) {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            form.setError(name as Path<V>, { message });
          }
        }
      });
    },
    [form],
  );

  return { error, setError, pending, run };
}
