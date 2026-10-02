/**
 * Balans, eski qarz, qarz muddati va to'lovni taqsimlash (PRD §5.10, §5.11) — toza funksiyalar.
 */
import type { IsoDate } from "../dates";
import type { Money } from "../money";

export interface LedgerTransaction {
  kind: "payment" | "charge" | "refund" | "adjustment" | "void";
  amount: Money;
  /** Hodisa sanasi (to'lov sanasi, yechish davri boshi) */
  occurredOn: IsoDate;
  /** Bir kunda tartib uchun */
  createdAt: string;
  /** Yechish/tuzatish qaysi oyga tegishli (YYYY-MM) */
  billingMonth: string | null;
  enrollmentId: string | null;
}

/** §5.10: balans = Σ amount (to'lov va qaytarishlar +, yechishlar −; bekor qilish teskari yozuv) */
export function balance(txs: readonly Pick<LedgerTransaction, "amount">[]): Money {
  return txs.reduce((s, t) => s + t.amount, 0);
}

/**
 * §5.10: eski qarz = min(0, balans + joriy oy yechishlari) — joriy oy hisobidan tashqari qolgan qarz.
 * Joriy oy yechishlari: shu oyga tegishli yechish va tuzatishlar yig'indisi.
 */
export function oldDebt(txs: readonly LedgerTransaction[], currentMonth: string): Money {
  const currentCharges = txs
    .filter(
      (t) => (t.kind === "charge" || t.kind === "adjustment") && t.billingMonth === currentMonth,
    )
    .reduce((s, t) => s + t.amount, 0);
  return Math.min(0, balance(txs) - currentCharges);
}

function chronological(txs: readonly LedgerTransaction[]): LedgerTransaction[] {
  return [...txs].sort(
    (a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.createdAt.localeCompare(b.createdAt),
  );
}

/** Qarz qaysi kundan beri: balans oxirgi marta manfiyga o'tgan kun (hozir qarz bo'lmasa — null) */
export function debtSince(txs: readonly LedgerTransaction[]): IsoDate | null {
  let running = 0;
  let since: IsoDate | null = null;
  for (const t of chronological(txs)) {
    const before = running;
    running += t.amount;
    if (before >= 0 && running < 0) since = t.occurredOn;
    if (running >= 0) since = null;
  }
  return running < 0 ? since : null;
}

export interface EnrollmentDebt {
  enrollmentId: string;
  /** A'zolik balansi (manfiy — qarz) */
  balance: Money;
  /** Qarz qaysi kundan beri (eng eskisi birinchi to'lanadi) */
  since: IsoDate | null;
}

export interface Allocation {
  /** null — umumiy balans (hech qaysi guruhga) */
  enrollmentId: string | null;
  amount: Money;
}

/**
 * §5.11: guruh ko'rsatilsa — o'sha a'zolikka; ko'rsatilmasa — eng eski qarzdan boshlab (FIFO)
 * bir nechta a'zolikka, ortiqchasi umumiy balansda qoladi (tasdiqlangan E-qoida).
 */
export function allocatePayment(
  amount: Money,
  debts: readonly EnrollmentDebt[],
  enrollmentId?: string | null,
): Allocation[] {
  if (amount <= 0) throw new RangeError("Payment amount must be positive");
  if (enrollmentId) return [{ enrollmentId, amount }];
  const queue = debts
    .filter((d) => d.balance < 0)
    .sort((a, b) => (a.since ?? "9999").localeCompare(b.since ?? "9999") || a.balance - b.balance);
  const out: Allocation[] = [];
  let left = amount;
  for (const d of queue) {
    if (left === 0) break;
    const part = Math.min(left, -d.balance);
    out.push({ enrollmentId: d.enrollmentId, amount: part });
    left -= part;
  }
  if (left > 0) out.push({ enrollmentId: null, amount: left });
  return out;
}

/** A'zoliklar bo'yicha qarzlar (taqsimlash uchun) */
export function enrollmentDebts(txs: readonly LedgerTransaction[]): EnrollmentDebt[] {
  const byEnrollment = new Map<string, LedgerTransaction[]>();
  for (const t of txs) {
    if (!t.enrollmentId) continue;
    const list = byEnrollment.get(t.enrollmentId) ?? [];
    list.push(t);
    byEnrollment.set(t.enrollmentId, list);
  }
  return [...byEnrollment].map(([enrollmentId, list]) => ({
    enrollmentId,
    balance: balance(list),
    since: debtSince(list),
  }));
}
