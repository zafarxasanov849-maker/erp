/**
 * Sof foyda va ortgan pul (PRD §6, tasdiqlangan A-qoida):
 * sof foyda = tushum − hamma xarajatlar ("Egasiga (foydadan)" dan tashqari);
 * ortgan pul = sof foyda − "Egasiga (foydadan)".
 */
export type ExpenseKind = "operating" | "salary" | "rent" | "marketing" | "tax" | "owner_draw";

export function profitOf(
  revenue: number,
  expenses: readonly { kind: ExpenseKind; amount: number }[],
) {
  const ownerDraw = expenses
    .filter((e) => e.kind === "owner_draw")
    .reduce((s, e) => s + e.amount, 0);
  const costs = expenses.filter((e) => e.kind !== "owner_draw").reduce((s, e) => s + e.amount, 0);
  const netProfit = revenue - costs;
  return { revenue, costs, ownerDraw, netProfit, leftover: netProfit - ownerDraw };
}
