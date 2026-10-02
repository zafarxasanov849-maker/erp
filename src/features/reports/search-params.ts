import { createLoader, createParser, parseAsStringLiteral } from "nuqs/server";

import { type IsoDate, isIsoDate } from "@/lib/dates";
import { REPORT_PRESETS, resolveReportPeriod } from "@/lib/metrics/period";

const parseAsIso = createParser({
  parse: (v) => (isIsoDate(v) ? v : null),
  serialize: (v: string) => v,
});

/** Hisobot davri — URL'da (nuqs): ?period=quarter yoki ?period=custom&from=…&to=… */
export const reportSearchParams = {
  period: parseAsStringLiteral(REPORT_PRESETS).withDefault("month"),
  from: parseAsIso,
  to: parseAsIso,
};

export const loadReportSearchParams = createLoader(reportSearchParams);

export async function loadReportPeriod(
  searchParams: Promise<Record<string, string | string[] | undefined>> | URLSearchParams,
  today: IsoDate,
) {
  const p = loadReportSearchParams(await searchParams);
  return resolveReportPeriod(p.period, today, { from: p.from, to: p.to });
}

export const REPORT_KINDS = ["finance", "attendance", "students", "sales"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
