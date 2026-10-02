"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/**
 * Dinamik kalitni tarjima qiladi (server action xatolari, zod xabarlari: "errors.forbidden",
 * "validation.required"). Kalit topilmasa o'zini qaytaradi.
 */
export function useTranslateKey() {
  const t = useTranslations();
  return useCallback(
    (key: string, values?: Record<string, string | number>) =>
      t.has(key as never) ? t(key as never, values as never) : key,
    [t],
  );
}
