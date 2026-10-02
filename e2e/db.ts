/**
 * E2E uchun tez tayyorgarlik: lokal Supabase'ga service role bilan to'g'ridan-to'g'ri yozish
 * (15 talabani UI orqali qo'shish testni sekinlashtiradi). Faqat lokal muhitda.
 */
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} topilmadi (.env.local)`);
  return line.slice(name.length + 1).trim();
}

export function adminDb() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error("E2E faqat lokal Supabase bilan");
  return createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

/** Guruhga N ta faol talaba (joinedAt sanasidan) */
export async function seedGroupStudents(groupId: string, names: string[], joinedAt: string) {
  const db = adminDb();
  const { data: group, error } = await db
    .from("groups")
    .select("organization_id, branch_id")
    .eq("id", groupId)
    .single();
  if (error) throw error;
  const { data: students, error: e1 } = await db
    .from("students")
    .insert(
      names.map((full_name, i) => ({
        organization_id: group.organization_id,
        branch_id: group.branch_id,
        full_name,
        phone: `+99833${String(Date.now() + i).slice(-7)}`,
        joined_at: joinedAt,
      })),
    )
    .select("id, full_name");
  if (e1) throw e1;
  const { error: e2 } = await db.from("enrollments").insert(
    students.map((s) => ({
      organization_id: group.organization_id,
      student_id: s.id,
      group_id: groupId,
      status: "active",
      joined_at: joinedAt,
      activated_at: joinedAt,
    })),
  );
  if (e2) throw e2;
  return students;
}

/** O'tgan sanalar uchun darslar (jadval generatori faqat bugundan boshlab yaratadi) */
export async function seedPastLessons(groupId: string, dates: string[]) {
  const db = adminDb();
  const { data: group, error } = await db
    .from("groups")
    .select("organization_id, start_time, end_time")
    .eq("id", groupId)
    .single();
  if (error) throw error;
  const { error: e1 } = await db.from("lessons").upsert(
    dates.map((date) => ({
      organization_id: group.organization_id,
      group_id: groupId,
      date,
      start_time: group.start_time,
      end_time: group.end_time,
      status: "scheduled" as const,
    })),
    { onConflict: "group_id,date,start_time", ignoreDuplicates: true },
  );
  if (e1) throw e1;
}

/** Toshkent bo'yicha bugun, "YYYY-MM-DD" */
export function tashkentToday(): string {
  return new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Ko'rsatkichlar uchun tayyor holat (hamma pul harakati bugun — oy boshida ham ishlaydi):
 * Chilonzor: A1, A2 faol (G1), T1 sinovda, L1 bugun chiqib ketgan; Sergeli: B1 faol (G2).
 * Tushum: A1 250 000, A2 400 000, B1 100 000 = 750 000 (3 talaba). Qarz: A1 −350 000, B1 −400 000.
 * Davomat: G1 kechagi darsda A1 — Keldi, A2 — Kelmadi; bugun G1 da belgilanmagan dars.
 */
export async function seedMetricsScenario(branchId: string) {
  const db = adminDb();
  const today = tashkentToday();
  const must = <T>(r: { data: T; error: unknown }): NonNullable<T> => {
    if (r.error) throw r.error;
    return r.data as NonNullable<T>;
  };
  const { organization_id: org } = must(
    await db.from("branches").select("organization_id").eq("id", branchId).single(),
  );
  const b2 = must(
    await db
      .from("branches")
      .insert({ organization_id: org, name: "Sergeli" })
      .select("id")
      .single(),
  ).id;
  const course = must(
    await db
      .from("courses")
      .insert({ organization_id: org, name: "Ingliz tili", monthly_price: 600_000 })
      .select("id")
      .single(),
  ).id;
  const groups = must(
    await db
      .from("groups")
      .insert(
        [
          ["G1", branchId],
          ["G2", b2],
        ].map(([name, branch]) => ({
          organization_id: org,
          branch_id: branch!,
          course_id: course,
          name: name!,
          monthly_price: 600_000,
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          start_time: "14:00",
          end_time: "15:30",
          start_date: shiftDays(today, -90),
        })),
      )
      .select("id, name"),
  );
  const g = (name: string) => groups.find((x) => x.name === name)!.id;
  const people: [string, string, string][] = [
    ["A1", branchId, "G1"],
    ["A2", branchId, "G1"],
    ["T1", branchId, "G1"],
    ["L1", branchId, "G1"],
    ["B1", b2, "G2"],
  ];
  const students = must(
    await db
      .from("students")
      .insert(
        people.map(([full_name, branch], i) => ({
          organization_id: org,
          branch_id: branch,
          full_name,
          phone: `+99833${String(Date.now() + i).slice(-7)}`,
          joined_at: shiftDays(today, -40),
        })),
      )
      .select("id, full_name"),
  );
  const s = (name: string) => students.find((x) => x.full_name === name)!.id;
  const reason = must(
    await db
      .from("reasons")
      .select("id")
      .eq("organization_id", org)
      .eq("kind", "leave")
      .limit(1)
      .single(),
  ).id;
  const enrollments = must(
    await db
      .from("enrollments")
      .insert(
        people.map(([name, , group]) => ({
          organization_id: org,
          student_id: s(name),
          group_id: g(group),
          status:
            name === "T1"
              ? ("trial" as const)
              : name === "L1"
                ? ("left" as const)
                : ("active" as const),
          joined_at: name === "T1" ? shiftDays(today, -2) : shiftDays(today, -40),
          activated_at: name === "T1" ? null : shiftDays(today, -40),
          left_at: name === "L1" ? today : null,
          leave_reason_id: name === "L1" ? reason : null,
        })),
      )
      .select("id, student_id"),
  );
  const method = must(
    await db
      .from("payment_methods")
      .select("id")
      .eq("organization_id", org)
      .eq("name", "Naqd")
      .single(),
  ).id;
  const tx = (name: string, branch: string, kind: "charge" | "payment", amount: number) => ({
    organization_id: org,
    branch_id: branch,
    student_id: s(name),
    kind,
    amount,
    occurred_on: today,
    method_id: kind === "payment" ? method : null,
    payment_ref: kind === "payment" ? crypto.randomUUID() : null,
  });
  must(
    await db
      .from("transactions")
      .insert([
        tx("A1", branchId, "charge", -600_000),
        tx("A1", branchId, "payment", 250_000),
        tx("A2", branchId, "payment", 400_000),
        tx("B1", b2, "charge", -500_000),
        tx("B1", b2, "payment", 100_000),
      ]),
  );
  const yesterday = shiftDays(today, -1);
  must(
    await db.from("lessons").upsert(
      {
        organization_id: org,
        group_id: g("G1"),
        date: today,
        // kech kechqurun — davomat hisobotiga (tugagan darslar) test vaqtida kirmaydi
        start_time: "23:58",
        end_time: "23:59",
        status: "scheduled" as const,
      },
      { onConflict: "group_id,date,start_time", ignoreDuplicates: true },
    ),
  );
  const lesson = must(
    await db
      .from("lessons")
      .upsert(
        {
          organization_id: org,
          group_id: g("G1"),
          date: yesterday,
          start_time: "14:00",
          end_time: "15:30",
          status: "held" as const,
        },
        { onConflict: "group_id,date,start_time" },
      )
      .select("id")
      .single(),
  ).id;
  const enr = (name: string) => enrollments.find((e) => e.student_id === s(name))!.id;
  must(
    await db.from("attendance").insert([
      {
        organization_id: org,
        lesson_id: lesson,
        enrollment_id: enr("A1"),
        status: "present" as const,
      },
      {
        organization_id: org,
        lesson_id: lesson,
        enrollment_id: enr("A2"),
        status: "absent" as const,
      },
    ]),
  );
  return { org, b2 };
}

/**
 * Xodim (tizim roli bilan) — UI orqali qo'shishdan tezroq. Parolni almashtirish talab qilinmaydi.
 * Ustoz bo'lsa, `teachGroup` guruhiga biriktiriladi.
 */
export async function seedStaff(opts: {
  org: string;
  branchId: string;
  role: "admin" | "teacher";
  fullName: string;
  phone: { local: string; e164: string };
  password: string;
  teachGroup?: string;
}) {
  const db = adminDb();
  const { data: user, error } = await db.auth.admin.createUser({
    phone: opts.phone.e164,
    password: opts.password,
    phone_confirm: true,
    user_metadata: { full_name: opts.fullName },
  });
  if (error || !user.user) throw error ?? new Error("createUser");
  const { data: role, error: e1 } = await db
    .from("roles")
    .select("id")
    .eq("organization_id", opts.org)
    .eq("system_key", opts.role)
    .single();
  if (e1) throw e1;
  const { data: staff, error: e2 } = await db
    .from("staff")
    .insert({
      organization_id: opts.org,
      user_id: user.user.id,
      role_id: role.id,
      all_branches: false,
      is_teacher: opts.role === "teacher",
    })
    .select("id")
    .single();
  if (e2) throw e2;
  const { error: e3 } = await db
    .from("staff_branches")
    .insert({ staff_id: staff.id, branch_id: opts.branchId });
  if (e3) throw e3;
  if (opts.teachGroup) {
    const { error: e4 } = await db
      .from("groups")
      .update({ teacher_id: staff.id })
      .eq("organization_id", opts.org)
      .eq("name", opts.teachGroup);
    if (e4) throw e4;
  }
  return staff.id;
}
