import "server-only";

import {
  type BillingReason,
  type LedgerEntry,
  type Rounding,
  monthsToReconcile,
  planMonth,
} from "@/lib/billing/calc";
import { type IsoDate, monthBounds, todayInTashkent } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Billing dvigateli — yechish va tuzatishlarni (charge/adjustment) yozadigan YAGONA joy.
 *
 * CLAUDE.md qoida 1 istisnosi (tasdiqlangan G-qoida): service role faqat shu faylda va cron'da.
 * Chaqiruvchi (Server Action) avval requirePermission() qiladi; dvigatel faqat "bo'lishi kerak"
 * holatni lib/billing/calc.ts (toza funksiyalar, Vitest) bo'yicha hisoblab, farqni yozadi.
 * Idempotent: bir xil holatda qayta chaqirilsa hech narsa yozilmaydi.
 */

type Admin = ReturnType<typeof createAdminClient>;

const CHUNK = 200;
const ROUNDINGS: readonly Rounding[] = [1, 100, 1000];

interface StoredBilling extends LedgerEntry {
  reason?: BillingReason;
}

function chunks<T>(list: readonly T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export interface ReconcileOptions {
  reason: BillingReason;
  /** Amalni bajargan xodim (cron — null) */
  actorStaffId?: string | null;
  today?: IsoDate;
}

export interface ReconcileResult {
  enrollments: number;
  transactions: number;
  /** Yig'indi (manfiy — yechilgan) */
  total: number;
}

/**
 * A'zoliklar bo'yicha hisob-kitobni haqiqiy holatga keltirish (faol bo'lgan oydan joriy oygacha).
 */
export async function reconcileEnrollments(
  enrollmentIds: readonly string[],
  options: ReconcileOptions,
): Promise<ReconcileResult> {
  const result: ReconcileResult = { enrollments: 0, transactions: 0, total: 0 };
  const ids = [...new Set(enrollmentIds)];
  if (ids.length === 0) return result;
  const admin = createAdminClient();
  for (const part of chunks(ids)) {
    const r = await reconcileChunk(admin, part, options);
    result.enrollments += r.enrollments;
    result.transactions += r.transactions;
    result.total += r.total;
  }
  return result;
}

async function reconcileChunk(
  admin: Admin,
  ids: string[],
  { reason, actorStaffId = null, today = todayInTashkent() }: ReconcileOptions,
): Promise<ReconcileResult> {
  const currentMonth = today.slice(0, 7);
  const enrollments = must(
    await admin
      .from("enrollments")
      .select(
        "id, organization_id, student_id, group_id, status, activated_at, left_at, price_override, group:groups ( branch_id, weekdays, start_date, end_date, monthly_price ), organization:organizations ( settings )",
      )
      .in("id", ids),
  );
  const [freezesRes, discountsRes, ledgerRes] = await Promise.all([
    admin.from("freezes").select("enrollment_id, date_from, date_to").in("enrollment_id", ids),
    admin
      .from("discounts")
      .select("enrollment_id, percent, amount, valid_from, valid_to")
      .in("enrollment_id", ids),
    admin
      .from("transactions")
      .select("enrollment_id, billing, created_at")
      .in("enrollment_id", ids)
      .in("kind", ["charge", "adjustment"])
      .not("billing", "is", null)
      .order("created_at"),
  ]);
  const freezes = must(freezesRes);
  const discounts = must(discountsRes);
  const ledgerRows = must(ledgerRes);

  // Daftar: a'zolik → oy → yozuvlar
  const ledger = new Map<string, Map<string, StoredBilling[]>>();
  for (const row of ledgerRows) {
    const b = row.billing as unknown as StoredBilling;
    if (!b?.month || !row.enrollment_id) continue;
    const byMonth = ledger.get(row.enrollment_id) ?? new Map<string, StoredBilling[]>();
    byMonth.set(b.month, [...(byMonth.get(b.month) ?? []), b]);
    ledger.set(row.enrollment_id, byMonth);
  }

  // Oylar va taqvim (bayramlar, bekor qilingan darslar) — bir so'rovda
  const plans = enrollments.map((e) => ({
    e,
    months: monthsToReconcile(
      { activatedAt: e.activated_at, leftAt: e.left_at },
      [...(ledger.get(e.id)?.keys() ?? [])],
      currentMonth,
    ),
  }));
  const allMonths = plans.flatMap((p) => p.months).sort();
  if (allMonths.length === 0) return { enrollments: enrollments.length, transactions: 0, total: 0 };
  const from = monthBounds(allMonths[0]!)[0];
  const to = monthBounds(allMonths[allMonths.length - 1]!)[1];
  const orgIds = [...new Set(enrollments.map((e) => e.organization_id))];
  const groupIds = [...new Set(enrollments.map((e) => e.group_id))];
  const [holidaysRes, cancelledRes] = await Promise.all([
    admin
      .from("holidays")
      .select("organization_id, branch_id, date")
      .in("organization_id", orgIds)
      .gte("date", from)
      .lte("date", to),
    admin
      .from("lessons")
      .select("group_id, date")
      .in("group_id", groupIds)
      .eq("status", "cancelled")
      .gte("date", from)
      .lte("date", to),
  ]);
  const holidays = must(holidaysRes);
  const cancelled = must(cancelledRes);

  const rows = [];
  let total = 0;
  for (const { e, months } of plans) {
    const group = e.group;
    if (!group) continue;
    const settings = (e.organization?.settings ?? {}) as Record<string, unknown>;
    const rounding = ROUNDINGS.includes(settings.rounding as Rounding)
      ? (settings.rounding as Rounding)
      : 1;
    for (const month of months) {
      const [mFrom, mTo] = monthBounds(month);
      const monthLedger = ledger.get(e.id)?.get(month) ?? [];
      const plan = planMonth({
        month,
        group: {
          weekdays: group.weekdays,
          startDate: group.start_date,
          endDate: group.end_date,
          price: e.price_override ?? group.monthly_price,
        },
        enrollment: {
          activatedAt: e.activated_at,
          leftAt: e.left_at,
          freezes: freezes
            .filter((f) => f.enrollment_id === e.id)
            .map((f) => [f.date_from, f.date_to] as const),
          discounts: discounts
            .filter((d) => d.enrollment_id === e.id)
            .map((d) => ({
              percent: d.percent === null ? null : Number(d.percent),
              amount: d.amount,
              from: d.valid_from,
              to: d.valid_to,
            })),
        },
        calendar: {
          holidays: (
            holidays as { organization_id: string; branch_id: string | null; date: string }[]
          )
            .filter(
              (h) =>
                h.organization_id === e.organization_id &&
                (h.branch_id === null || h.branch_id === group.branch_id) &&
                h.date >= mFrom &&
                h.date <= mTo,
            )
            .map((h) => h.date),
          cancelled: cancelled
            .filter((l) => l.group_id === e.group_id && l.date >= mFrom && l.date <= mTo)
            .map((l) => l.date),
        },
        ledger: monthLedger,
        settings: { rounding, refundOnLeave: settings.refund_on_leave !== false },
      });
      if (!plan) continue;
      const billing: StoredBilling = {
        month,
        basis: plan.basis,
        lessons: plan.lessons,
        reason: monthLedger.length === 0 && reason !== "activation" ? "monthly" : reason,
      };
      rows.push({
        organization_id: e.organization_id,
        branch_id: group.branch_id,
        student_id: e.student_id,
        enrollment_id: e.id,
        kind: plan.kind,
        amount: plan.amount,
        period_start: plan.periodStart,
        period_end: plan.periodEnd,
        lessons_count: plan.lessonsCount,
        billing: billing as unknown as Json,
        occurred_on: today,
        created_by: actorStaffId,
        // charge:{enrollment_id}:{YYYY-MM} (CLAUDE.md qoida 6); tuzatishlar — tartib raqami bilan
        idempotency_key:
          plan.kind === "charge"
            ? `charge:${e.id}:${month}`
            : `adj:${e.id}:${month}:${monthLedger.length}`,
      });
      total += plan.amount;
    }
  }

  if (rows.length > 0) {
    // Bir vaqtda ikki marta chaqirilsa — ikkinchisi idempotency_key bo'yicha tashlab yuboriladi
    must(
      await admin
        .from("transactions")
        .upsert(rows, { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true }),
    );
  }
  return { enrollments: enrollments.length, transactions: rows.length, total };
}

/** Darslar bekor qilindi yoki tiklandi (bayram) — o'sha guruh a'zoliklarini qayta hisoblash */
export async function reconcileLessons(
  lessonIds: readonly string[],
  options: ReconcileOptions,
): Promise<void> {
  if (lessonIds.length === 0) return;
  const admin = createAdminClient();
  const lessons = (
    await Promise.all(
      chunks(lessonIds).map(async (part) =>
        must(await admin.from("lessons").select("group_id, date").in("id", part)),
      ),
    )
  ).flat();
  const groupIds = [...new Set(lessons.map((l) => l.group_id))];
  if (groupIds.length === 0) return;
  const minDate = lessons.reduce((m, l) => (l.date < m ? l.date : m), lessons[0]!.date);
  const enrollments = must(
    await admin
      .from("enrollments")
      .select("id")
      .in("group_id", groupIds)
      .not("activated_at", "is", null)
      .or(`left_at.is.null,left_at.gte.${minDate}`),
  );
  await reconcileEnrollments(
    enrollments.map((e) => e.id),
    options,
  );
}

/**
 * Tungi cron: hamma faol (va oy ichida chiqqan) a'zoliklar uchun joriy oy. Oyning 1-kunida bu —
 * oylik yechish (§5.2); boshqa kunlari — xavfsizlik to'ri (biror hodisa o'tkazib yuborilgan bo'lsa).
 * Markaz bo'yicha natija audit_log'ga yoziladi.
 */
export async function runNightlyBilling(today = todayInTashkent()) {
  const admin = createAdminClient();
  const [monthStart] = monthBounds(today.slice(0, 7));
  const enrollments = must(
    await admin
      .from("enrollments")
      .select("id, organization_id")
      .not("activated_at", "is", null)
      .neq("status", "trial")
      .or(`left_at.is.null,left_at.gte.${monthStart}`),
  );
  const byOrg = new Map<string, string[]>();
  for (const e of enrollments)
    byOrg.set(e.organization_id, [...(byOrg.get(e.organization_id) ?? []), e.id]);

  const report: Record<string, ReconcileResult> = {};
  for (const [orgId, ids] of byOrg) {
    const r = await reconcileEnrollments(ids, { reason: "monthly", today });
    report[orgId] = r;
    if (r.transactions > 0) {
      await admin.from("audit_log").insert({
        organization_id: orgId,
        actor_id: null,
        action: "billing.nightly",
        entity: "organizations",
        entity_id: orgId,
        diff: { date: today, ...r } as unknown as Json,
      });
    }
  }
  return report;
}
