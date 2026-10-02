import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PrintButton } from "@/features/billing/components/print-button";
import { getReceipt } from "@/features/billing/queries";
import { requirePagePermission } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("billing.receipt");
  return { title: t("title") };
}

/** To'lov cheki — 58 mm termal printer uchun (print CSS) */
export default async function ReceiptPage({ params }: { params: Promise<{ paymentRef: string }> }) {
  const { paymentRef } = await params;
  await requirePagePermission("payments.view");
  if (!UUID.test(paymentRef)) notFound();
  const r = await getReceipt(paymentRef);
  if (!r) notFound();
  const t = await getTranslations("billing.receipt");

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground print:text-black">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-xs gap-4 print:max-w-none">
      <style>{`@media print { @page { size: 58mm auto; margin: 2mm; } body { background: #fff; } }`}</style>
      <div className="print:hidden">
        <PrintButton label={t("print")} />
      </div>
      <article
        className="relative grid gap-2 rounded-lg border bg-white p-4 font-mono text-[12px] leading-snug text-black print:rounded-none print:border-0 print:p-0"
        data-testid="receipt"
      >
        <header className="text-center">
          <div className="text-sm font-bold">{r.orgName}</div>
          {r.branch && (
            <div>
              {r.branch.name}
              {r.branch.address && <div>{r.branch.address}</div>}
              {r.branch.phone && <div>{formatPhone(r.branch.phone)}</div>}
            </div>
          )}
        </header>
        <hr className="border-dashed border-black/50" />
        <div className="text-center font-bold">{t("no", { no: r.receiptNo ?? "—" })}</div>
        {row(t("date"), `${formatDate(r.paidOn)} ${formatTime(r.createdAt)}`)}
        {row(t("student"), r.student?.full_name ?? "")}
        <hr className="border-dashed border-black/50" />
        {r.parts.map((p, i) => (
          <div key={i}>{row(p.group ?? t("generalBalance"), formatMoney(p.amount))}</div>
        ))}
        <hr className="border-dashed border-black/50" />
        <div className="flex justify-between text-sm font-bold">
          <span>{t("total")}</span>
          <span data-testid="receipt-total">{formatMoney(r.total)}</span>
        </div>
        {row(t("method"), r.method)}
        {r.cashier && row(t("cashier"), r.cashier)}
        {r.note && <div className="italic">{r.note}</div>}
        {r.voided && (
          <div
            className="rotate-[-8deg] border-2 border-red-600 py-1 text-center text-base font-bold text-red-600"
            data-testid="receipt-voided"
          >
            {t("voided")}
            {r.voided.reason && <div className="text-[11px] font-normal">{r.voided.reason}</div>}
          </div>
        )}
        <hr className="border-dashed border-black/50" />
        <div className="text-center">{t("thanks")}</div>
      </article>
    </div>
  );
}
