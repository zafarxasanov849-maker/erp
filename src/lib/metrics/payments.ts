/** Tushumlar ro'yxati jamlari: bekor qilinganlar hisobga olinmaydi (metric_revenue bilan bir xil). */
export interface PaymentLike {
  amount: number;
  methodName: string;
  voided: boolean;
}

export function summarizePayments(items: readonly PaymentLike[]) {
  const byMethod = new Map<string, { amount: number; count: number }>();
  let total = 0;
  let count = 0;
  let voidedCount = 0;
  for (const p of items) {
    if (p.voided) {
      voidedCount += 1;
      continue;
    }
    total += p.amount;
    count += 1;
    const m = byMethod.get(p.methodName) ?? { amount: 0, count: 0 };
    m.amount += p.amount;
    m.count += 1;
    byMethod.set(p.methodName, m);
  }
  return {
    total,
    count,
    voidedCount,
    byMethod: [...byMethod.entries()]
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.amount - a.amount || a.method.localeCompare(b.method)),
  };
}
