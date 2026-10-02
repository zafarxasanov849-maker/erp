"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { allocatePayment, enrollmentDebts } from "@/lib/billing/balance";
import { createClient } from "@/lib/supabase/server";
import { toIsoDate } from "@/lib/validation";

import { onEnrollmentsChanged } from "./events";
import {
  type PaymentMethodOption,
  getPaymentMethods,
  getStudentLedger,
  toLedgerTransactions,
} from "./queries";
import {
  type DiscountValues,
  type PaymentValues,
  type VoidValues,
  discountSchema,
  paymentSchema,
  voidSchema,
} from "./schema";

export interface PaymentFormData {
  studentName: string;
  balance: number;
  enrollments: { id: string; groupName: string; status: string }[];
  methods: PaymentMethodOption[];
}

/** To'lov dialogi uchun (ro'yxatdan ham, profildan ham ochiladi) */
export async function getPaymentFormData(
  studentId: string,
): Promise<ActionResult<PaymentFormData>> {
  return runAction(async () => {
    const ctx = await requirePermission("payments.create");
    const supabase = await createClient();
    const [student, enrollments, methods, ledger] = await Promise.all([
      supabase.from("students").select("full_name").eq("id", studentId).single(),
      supabase
        .from("enrollments")
        .select("id, status, group:groups ( name )")
        .eq("student_id", studentId)
        .neq("status", "left")
        .order("created_at"),
      getPaymentMethods(ctx.membership.orgId),
      getStudentLedger(studentId),
    ]);
    return {
      studentName: unwrap(student).full_name,
      balance: ledger.reduce((s, r) => s + r.amount, 0),
      enrollments: unwrap(enrollments).map((e) => ({
        id: e.id,
        groupName: e.group?.name ?? "",
        status: e.status,
      })),
      methods,
    };
  });
}

/** §5.11: guruh ko'rsatilmasa — eng eski qarzdan (FIFO), ortiqchasi umumiy balansda */
export async function receivePayment(
  input: PaymentValues,
): Promise<ActionResult<{ paymentRef: string; receiptNo: number }>> {
  return runAction(async () => {
    await requirePermission("payments.create");
    const v = parseInput(paymentSchema, input);
    const ledger = await getStudentLedger(v.studentId);
    const parts = allocatePayment(
      v.amount,
      enrollmentDebts(toLedgerTransactions(ledger)),
      v.enrollmentId || null,
    );
    const supabase = await createClient();
    const result = unwrap(
      await supabase.rpc("receive_payment", {
        p_student: v.studentId,
        p_method: v.methodId,
        p_paid_on: toIsoDate(v.paidOn),
        p_note: v.note,
        p_parts: parts.map((p) => ({ enrollment_id: p.enrollmentId, amount: p.amount })),
        p_key: v.key,
      }),
    ) as { payment_ref: string; receipt_no: number };
    revalidatePath("/", "layout");
    return { paymentRef: result.payment_ref, receiptNo: result.receipt_no };
  });
}

/** §5.12: o'chirilmaydi — teskari yozuv, sabab majburiy, payments.void */
export async function voidPayment(input: VoidValues): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("payments.void");
    const v = parseInput(voidSchema, input);
    const supabase = await createClient();
    unwrap(await supabase.rpc("void_payment", { p_payment_ref: v.paymentRef, p_reason: v.reason }));
    revalidatePath("/", "layout");
    return null;
  });
}

/** §5.8: chegirma a'zolikka; allaqachon yechilgan darslar uchun farq qaytariladi (C-qoida) */
export async function addDiscount(input: DiscountValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("discounts.manage");
    const v = parseInput(discountSchema, input);
    const supabase = await createClient();
    unwrap(
      await supabase.from("discounts").insert({
        organization_id: ctx.membership.orgId,
        enrollment_id: v.enrollmentId,
        percent: v.type === "percent" ? v.value : null,
        amount: v.type === "amount" ? v.value : null,
        valid_from: toIsoDate(v.from),
        valid_to: v.to ? toIsoDate(v.to) : null,
        reason: v.reason,
      }),
    );
    await onEnrollmentsChanged([v.enrollmentId], "discount", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function removeDiscount(discountId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("discounts.manage");
    const supabase = await createClient();
    const deleted = unwrap(
      await supabase.from("discounts").delete().eq("id", discountId).select("enrollment_id"),
    );
    const row = deleted[0];
    if (!row) throw new ActionError("errors.notFound");
    await onEnrollmentsChanged([row.enrollment_id], "discount", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return null;
  });
}
