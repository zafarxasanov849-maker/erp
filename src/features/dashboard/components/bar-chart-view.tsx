"use client";

import { useLocale } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type MoneyLocale, formatMoney, formatMoneyCompact } from "@/lib/money";

export interface ChartSeries {
  key: string;
  label: string;
  /** CSS rang: "var(--primary)" va h.k. */
  color: string;
}

export type ChartRow = Record<string, string | number>;

/**
 * Ustunli grafik (Recharts). Ekran o'quvchilar uchun ostida yashirin jadval ham chiqadi.
 * layout="horizontal" — gorizontal ustunlar (filiallarni solishtirish: nomlar uzun bo'lishi mumkin).
 */
export function BarChartView({
  data,
  categoryKey,
  series,
  format,
  layout = "vertical",
  height = 260,
  label,
}: {
  data: ChartRow[];
  categoryKey: string;
  series: ChartSeries[];
  format: "money" | "count";
  layout?: "vertical" | "horizontal";
  height?: number;
  /** Grafik nomi (aria-label va yashirin jadval sarlavhasi) */
  label: string;
}) {
  const locale = useLocale() as MoneyLocale;
  const full = (v: number) =>
    format === "money" ? formatMoney(v, { locale }) : new Intl.NumberFormat("ru-RU").format(v);
  const short = (v: number) =>
    format === "money" ? formatMoneyCompact(v, locale) : String(Math.round(v));
  const horizontal = layout === "horizontal";

  return (
    <figure className="min-w-0">
      <div role="img" aria-label={label} style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: horizontal ? 24 : 8, bottom: 0, left: 0 }}
            barCategoryGap={horizontal ? "25%" : "30%"}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={horizontal}
              horizontal={!horizontal}
              stroke="var(--border)"
            />
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  tickFormatter={short}
                  tickCount={4}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey={categoryKey}
                  width={110}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={categoryKey}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={short}
                  width={format === "money" ? 84 : 36}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
              </>
            )}
            <Tooltip
              separator=": "
              cursor={{ fill: "var(--accent)", opacity: 0.6 }}
              formatter={(v, name) => [full(Number(v)), name]}
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col" />
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={String(row[categoryKey])}>
              <th scope="row">{row[categoryKey]}</th>
              {series.map((s) => (
                <td key={s.key}>{full(Number(row[s.key] ?? 0))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
