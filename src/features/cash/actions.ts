"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import {
  type HandoverValues,
  type VoidHandoverValues,
  handoverSchema,
  voidHandoverSchema,
} from "./schema";

/** Pul topshirish (F): darhol oluvchiga o'tadi */
export async function handoverCash(input: HandoverValues): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("cash.handover");
    const v = parseInput(handoverSchema, input);
    const supabase = await createClient();
    unwrap(
      await supabase.rpc("handover_cash", {
        p_branch: v.branchId,
        p_to_staff: (v.toStaffId || null) as string,
        p_method: v.methodId,
        p_amount: v.amount,
        p_note: v.note ?? "",
      }),
    );
    revalidatePath("/", "layout");
    return null;
  });
}

/** Xato topshirishni bekor qilish — kassani boshqaruvchi, sabab majburiy */
export async function voidHandover(input: VoidHandoverValues): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("cash.view");
    const v = parseInput(voidHandoverSchema, input);
    const supabase = await createClient();
    unwrap(await supabase.rpc("void_handover", { p_id: v.id, p_reason: v.reason }));
    revalidatePath("/", "layout");
    return null;
  });
}
