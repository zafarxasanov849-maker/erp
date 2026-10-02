"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { DateInput } from "@/components/date-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XLSX_TYPE, downloadBase64 } from "@/lib/download";
import { useTranslateKey } from "@/i18n/use-translate-key";
import { formatDate, parseUiDate } from "@/lib/dates";
import { REPORT_PRESETS, type ReportPreset } from "@/lib/metrics/period";

import { exportReport } from "../export";
import { type ReportKind, reportSearchParams } from "../search-params";

/**
 * Hisobot davri (tayyor variant yoki qo'lda) va Excel'ga yuklash.
 * Davr URL'da saqlanadi — havolani ulashsa, xuddi shu hisobot ochiladi.
 */
export function ReportToolbar({
  kind,
  branchId,
  period,
  canExport,
}: {
  /** null — eksportsiz (masalan, Tushumlar ro'yxati) */
  kind: ReportKind | null;
  branchId: string;
  /** Server hisoblagan haqiqiy davr (noto'g'ri qo'lda kiritilgan bo'lsa — "month") */
  period: { preset: ReportPreset; from: string; to: string };
  canExport: boolean;
}) {
  const t = useTranslations("reports");
  const tk = useTranslateKey();
  const [, setParams] = useQueryStates(reportSearchParams, { shallow: false });
  const [preset, setPreset] = useState<ReportPreset>(period.preset);
  const [from, setFrom] = useState(formatDate(period.from));
  const [to, setTo] = useState(formatDate(period.to));
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  function choose(value: ReportPreset) {
    setPreset(value);
    if (value !== "custom") {
      startTransition(() => void setParams({ period: value, from: null, to: null }));
    }
  }

  function applyCustom() {
    const f = parseUiDate(from);
    const tt = parseUiDate(to);
    if (!f || !tt || f > tt) {
      toast.error(t("periodInvalid"));
      return;
    }
    startTransition(() => void setParams({ period: "custom", from: f, to: tt }));
  }

  function exportXlsx() {
    if (!kind) return;
    setExporting(true);
    exportReport(kind, branchId, window.location.search).then((r) => {
      setExporting(false);
      if (!r.ok) {
        toast.error(tk(r.error));
        return;
      }
      downloadBase64(r.data.fileName, r.data.base64, XLSX_TYPE);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2" data-testid="report-toolbar">
      <div className="grid gap-1">
        <span className="text-xs text-muted-foreground" id="report-period-label">
          {t("period")}
        </span>
        <Select value={preset} onValueChange={(v) => choose(v as ReportPreset)}>
          <SelectTrigger
            size="sm"
            className="min-w-44"
            aria-labelledby="report-period-label"
            disabled={pending}
          >
            <SelectValue>{t(`presets.${preset}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {REPORT_PRESETS.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`presets.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {preset === "custom" && (
        <>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">{t("from")}</span>
            <DateInput value={from} onChange={setFrom} className="h-8 w-36" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">{t("to")}</span>
            <DateInput value={to} onChange={setTo} className="h-8 w-36" />
          </label>
          <Button size="sm" onClick={applyCustom} disabled={pending}>
            {t("apply")}
          </Button>
        </>
      )}
      <span
        className="pb-1.5 text-sm text-muted-foreground tabular-nums"
        data-testid="report-range"
      >
        {formatDate(period.from)} – {formatDate(period.to)}
      </span>
      {canExport && kind && (
        <Button
          variant="outline"
          size="sm"
          className="sm:ml-auto"
          onClick={exportXlsx}
          disabled={exporting}
        >
          <Download />
          {t("export")}
        </Button>
      )}
    </div>
  );
}
