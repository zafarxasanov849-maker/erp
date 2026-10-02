import { ArrowDownRight, ArrowUpRight, type LucideIcon, Minus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface StatChange {
  /** Foiz (null — solishtirib bo'lmaydi, o'tgan davrda 0). */
  value: number | null;
  /** Qaysi yo'nalish yaxshi: tushum o'ssa yaxshi, qarz o'ssa yomon. */
  good: "up" | "down";
  /** "o'tgan oyning shu kunlariga nisbatan" */
  label: string;
  /** "+12,5%" — server tomonda formatlangan */
  text: string;
}

/** Bosh sahifa kartochkasi: qiymat, o'zgarish foizi, bosilsa — batafsil sahifa. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  change,
  muted,
  testId,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  href?: string;
  change?: StatChange;
  /** Hali ishlamaydigan ko'rsatkich (keyingi bosqich) */
  muted?: boolean;
  testId?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <div
        className={cn(
          "text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums",
          muted && "text-muted-foreground",
        )}
        data-testid={testId ? `${testId}-value` : undefined}
      >
        {value}
      </div>
      {change && <ChangeBadge change={change} />}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </>
  );
  const className =
    "grid min-w-0 content-start gap-1.5 rounded-xl border bg-card p-4 text-card-foreground shadow-sm";
  return href ? (
    <Link
      href={href}
      className={cn(className, "transition-colors hover:bg-accent/50")}
      data-testid={testId}
    >
      {body}
    </Link>
  ) : (
    <div className={className} data-testid={testId}>
      {body}
    </div>
  );
}

function ChangeBadge({ change }: { change: StatChange }) {
  const { value, good } = change;
  if (value === null) return <div className="text-xs text-muted-foreground">{change.label}</div>;
  const tone =
    value === 0
      ? "text-muted-foreground"
      : value > 0 === (good === "up")
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-red-700 dark:text-red-400";
  const Icon = value === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
      <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", tone)}>
        <Icon className="size-3.5" aria-hidden />
        {change.text}
      </span>
      <span className="text-muted-foreground">{change.label}</span>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="grid gap-3 rounded-xl border p-4 shadow-sm">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function StatGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-3 rounded-xl border p-4", className)}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
