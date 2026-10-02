import "server-only";

import { getFormatter, getTranslations } from "next-intl/server";

import { changePercent } from "@/lib/metrics/period";

import type { StatChange } from "./components/stat-card";

/**
 * Kartochka uchun o'zgarish: "+12,5%" va izoh. Oldingi qiymat 0 bo'lsa — "—" (solishtirib bo'lmaydi).
 * kind: "flow" — o'tgan oyning shu kunlari bilan; "stock" — o'tgan oyning shu kuni bilan (B-qoida).
 */
export async function statChange(
  current: number,
  previous: number,
  good: "up" | "down",
  kind: "flow" | "stock",
): Promise<StatChange> {
  const t = await getTranslations("dashboard.change");
  const format = await getFormatter();
  const value = changePercent(current, previous);
  return {
    value,
    good,
    text:
      value === null
        ? "—"
        : `${format.number(value, { maximumFractionDigits: 1, signDisplay: "exceptZero" })}%`,
    label: value === null ? t("noBase") : t(kind),
  };
}
