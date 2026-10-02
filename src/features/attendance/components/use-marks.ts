"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useTranslateKey } from "@/i18n/use-translate-key";
import type { Mark } from "@/lib/attendance";

import { saveAttendance } from "../actions";
import type { JournalMark } from "../queries";

const DEBOUNCE_MS = 500;

const keyOf = (lessonId: string, enrollmentId: string) => `${lessonId}:${enrollmentId}`;

/**
 * Davomat belgilari: optimistik yangilash, dars bo'yicha 500 ms yig'ib bitta so'rov,
 * xatoda tasdiqlangan holatga qaytarish. Bir darsning so'rovlari ketma-ket yuboriladi.
 */
export function useMarks(initial: readonly JournalMark[]) {
  const tk = useTranslateKey();
  const t = useTranslations("attendance.journal");
  const [marks, setMarks] = useState(
    () => new Map<string, Mark>(initial.map((m) => [keyOf(m.lessonId, m.enrollmentId), m.status])),
  );
  const confirmed = useRef(new Map(marks));
  const pending = useRef(new Map<string, Map<string, Mark>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const chains = useRef(new Map<string, Promise<void>>());
  const [inFlight, setInFlight] = useState(0);

  const flush = useCallback(
    (lessonId: string) => {
      clearTimeout(timers.current.get(lessonId));
      timers.current.delete(lessonId);
      const batch = pending.current.get(lessonId);
      if (!batch || batch.size === 0) return;
      pending.current.delete(lessonId);

      const previous = chains.current.get(lessonId) ?? Promise.resolve();
      const next = previous.then(async () => {
        setInFlight((n) => n + 1);
        const result = await saveAttendance({
          lessonId,
          marks: [...batch].map(([enrollmentId, status]) => ({ enrollmentId, status })),
        }).catch(() => ({ ok: false as const, error: "errors.unexpected" }));
        setInFlight((n) => n - 1);
        if (result.ok) {
          for (const [enrollmentId, status] of batch) {
            confirmed.current.set(keyOf(lessonId, enrollmentId), status);
          }
          return;
        }
        // Qaytarish (shu orada yana bosilgan kataklardan tashqari)
        const again = pending.current.get(lessonId);
        setMarks((prev) => {
          const copy = new Map(prev);
          for (const enrollmentId of batch.keys()) {
            if (again?.has(enrollmentId)) continue;
            const k = keyOf(lessonId, enrollmentId);
            copy.set(k, confirmed.current.get(k) ?? null);
          }
          return copy;
        });
        toast.error(tk(result.error));
      });
      chains.current.set(lessonId, next);
    },
    [tk],
  );

  const set = useCallback(
    (lessonId: string, updates: readonly { enrollmentId: string; status: Mark }[]) => {
      if (updates.length === 0) return;
      setMarks((prev) => {
        const copy = new Map(prev);
        for (const u of updates) copy.set(keyOf(lessonId, u.enrollmentId), u.status);
        return copy;
      });
      const batch = pending.current.get(lessonId) ?? new Map<string, Mark>();
      for (const u of updates) batch.set(u.enrollmentId, u.status);
      pending.current.set(lessonId, batch);
      clearTimeout(timers.current.get(lessonId));
      timers.current.set(
        lessonId,
        setTimeout(() => flush(lessonId), DEBOUNCE_MS),
      );
    },
    [flush],
  );

  // Sahifadan chiqib ketilsa ham saqlanmagan belgilar yuboriladi
  useEffect(() => {
    const flushAll = () => {
      for (const lessonId of [...pending.current.keys()]) flush(lessonId);
    };
    const onHide = () => document.visibilityState === "hidden" && flushAll();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushAll);
      flushAll();
    };
  }, [flush]);

  const get = useCallback(
    (lessonId: string, enrollmentId: string): Mark =>
      marks.get(keyOf(lessonId, enrollmentId)) ?? null,
    [marks],
  );

  const dirty = inFlight > 0 || timers.current.size > 0;
  return { get, set, saving: dirty, savingLabel: dirty ? t("saving") : t("allSaved") };
}
