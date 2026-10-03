import "server-only";

import { unwrap } from "@/lib/action";
import type { IsoDate } from "@/lib/dates";
import { rpcBranch } from "@/lib/metrics/rpc";
import { createClient } from "@/lib/supabase/server";

/** Qo'limdagi pul (E, G): har egasi (xodim yoki filial kassasi) × to'lov turi — cash_positions() */
export async function getCashPositions(
  orgId: string,
  branchId: string | null,
  from: IsoDate,
  to: IsoDate,
) {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.rpc("cash_positions", {
      p_org: orgId,
      p_branch: rpcBranch(branchId),
      p_from: from,
      p_to: to,
    }),
  );
  return rows.map((r) => ({
    staffId: r.staff_id as string | null,
    kassaBranchId: r.kassa_branch_id as string | null,
    methodId: r.method_id,
    opening: r.opening,
    received: r.received,
    spent: r.spent,
    handedOut: r.handed_out,
    handedIn: r.handed_in,
    closing: r.closing,
  }));
}
export type CashPosition = Awaited<ReturnType<typeof getCashPositions>>[number];

/** Pul topshirishlar tarixi (RLS: cash.view — filialdagilar; aks holda o'zi bergan/olganlar) */
export async function listHandovers(
  orgId: string,
  branchId: string | null,
  from: IsoDate,
  to: IsoDate,
) {
  const supabase = await createClient();
  let q = supabase
    .from("cash_handovers")
    .select(
      "id, branch_id, from_staff_id, to_staff_id, method_id, amount, note, handed_on, created_at, voided_at, void_reason",
    )
    .eq("organization_id", orgId)
    .gte("handed_on", from)
    .lte("handed_on", to)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (branchId) q = q.eq("branch_id", branchId);
  return unwrap(await q).map((h) => ({
    id: h.id,
    branchId: h.branch_id,
    fromStaffId: h.from_staff_id,
    toStaffId: h.to_staff_id,
    methodId: h.method_id,
    amount: h.amount,
    note: h.note,
    handedOn: h.handed_on,
    voided: h.voided_at !== null,
    voidReason: h.void_reason,
  }));
}
export type Handover = Awaited<ReturnType<typeof listHandovers>>[number];
