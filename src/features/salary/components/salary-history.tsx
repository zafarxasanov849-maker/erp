import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoneyAmount } from "@/features/billing/components/student-ledger";

/** Oxirgi oylar qoldiqlari va umumiy qoldiq (K: qoldiq keyingi oyga o'tmaydi, lekin ko'rinadi) */
export async function SalaryHistory({
  history,
  totalDue,
  basePath,
}: {
  history: {
    month: string;
    accrued: number;
    paid: number;
    bonus: number;
    penalty: number;
    due: number;
  }[];
  totalDue: number;
  basePath: string;
}) {
  const t = await getTranslations("salary");
  const tm = await getTranslations("months");
  if (history.length === 0) return null;
  const name = (m: string) => `${tm(String(Number(m.slice(5))) as "1")} ${m.slice(0, 4)}`;
  return (
    <section className="space-y-2" aria-labelledby="salary-history">
      <div>
        <h2 id="salary-history" className="font-semibold">
          {t("history")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("historyHint")}</p>
      </div>
      <div className="min-w-0 overflow-x-auto rounded-lg border" data-testid="salary-history">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("month")}</TableHead>
              <TableHead className="text-right">{t("summary.calculated")}</TableHead>
              <TableHead className="hidden text-right sm:table-cell">{t("summary.paid")}</TableHead>
              <TableHead className="text-right">{t("summary.due")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.month}>
                <TableCell>
                  <Link href={`${basePath}?month=${h.month}`} className="hover:underline">
                    {name(h.month)}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  <MoneyAmount value={h.accrued + h.bonus - h.penalty} />
                </TableCell>
                <TableCell className="hidden text-right sm:table-cell">
                  <MoneyAmount value={h.paid} />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyAmount value={h.due} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>{t("totalDue")}</TableCell>
              <TableCell className="text-right" data-testid="salary-total-due">
                <MoneyAmount value={totalDue} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  );
}
