import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { shiftMonth, todayInTashkent } from "@/lib/dates";

/** Oy tanlagich: ‹ Oktabr 2026 › (kelajak oyga o'tmaydi) */
export async function MonthNav({ month, basePath }: { month: string; basePath: string }) {
  const t = await getTranslations("salary");
  const tm = await getTranslations("months");
  const current = todayInTashkent().slice(0, 7);
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const label = `${tm(String(Number(month.slice(5))) as "1")} ${month.slice(0, 4)}`;
  return (
    <div className="flex items-center gap-1" data-testid="month-nav">
      <Button asChild variant="outline" size="icon" className="size-8">
        <Link href={`${basePath}?month=${prev}`} aria-label={t("prevMonth")}>
          <ChevronLeft />
        </Link>
      </Button>
      <span className="min-w-36 text-center font-medium" data-testid="month-label">
        {label}
      </span>
      {next <= current ? (
        <Button asChild variant="outline" size="icon" className="size-8">
          <Link href={`${basePath}?month=${next}`} aria-label={t("nextMonth")}>
            <ChevronRight />
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled
          aria-label={t("nextMonth")}
        >
          <ChevronRight />
        </Button>
      )}
    </div>
  );
}
