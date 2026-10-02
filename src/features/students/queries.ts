import "server-only";

import { unwrap } from "@/lib/action";
import { createClient } from "@/lib/supabase/server";

import type { EnrollmentStatus, StudentStatus } from "./schema";
import { STUDENTS_PAGE_SIZE, type StudentListFilters } from "./search-params";

/** PostgREST `or()` sintaksisini buzadigan belgilarni olib tashlaydi. */
export function sanitizeSearch(q: string): string {
  return q
    .replace(/[,()*%\\"':]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

const SORT_COLUMNS = {
  name: "full_name",
  joined: "joined_at",
  created: "created_at",
  balance: "balance",
} as const;

function buildQuery(
  supabase: Supabase,
  orgId: string,
  branchId: string | null,
  p: StudentListFilters,
) {
  let q = supabase
    .from("students_overview")
    .select(
      "id, branch_id, full_name, phone, parent_phone, joined_at, status, tag_ids, balance, old_debt",
      {
        count: "exact",
      },
    )
    .eq("organization_id", orgId);

  const branch = branchId ?? p.branch;
  if (branch) q = q.eq("branch_id", branch);
  if (p.status === "debtor") q = q.eq("status", "active").lt("balance", 0);
  else if (p.status === "trial_expired") q = q.eq("trial_expired", true).neq("status", "archived");
  else q = p.status ? q.eq("status", p.status) : q.neq("status", "archived");
  if (p.group) q = q.contains("group_ids", [p.group]);
  if (p.course) q = q.contains("course_ids", [p.course]);
  if (p.teacher) q = q.contains("teacher_ids", [p.teacher]);
  if (p.tag) q = q.contains("tag_ids", [p.tag]);
  if (p.from) q = q.gte("joined_at", p.from);
  if (p.to) q = q.lte("joined_at", p.to);

  const search = sanitizeSearch(p.q);
  if (search) {
    const digits = search.replace(/\D/g, "");
    const parts = [`full_name.ilike.%${search}%`];
    // Raqam bilan qidirish: "90 123" → telefonda "90123"
    if (digits.length >= 3 && /^[\d\s+\-]+$/.test(search)) {
      parts.push(`phone.ilike.%${digits}%`, `parent_phone.ilike.%${digits}%`);
    }
    q = q.or(parts.join(","));
  }

  return q
    .order(SORT_COLUMNS[p.sort], { ascending: p.dir === "asc" })
    .order("id", { ascending: true });
}

export interface StudentGroupRef {
  id: string;
  name: string;
  status: EnrollmentStatus;
  courseName: string;
  teacherName: string | null;
  weekdays: number[];
  startTime: string;
  endTime: string;
}

export interface StudentListRow {
  id: string;
  branchId: string;
  fullName: string;
  phone: string;
  parentPhone: string | null;
  joinedAt: string;
  status: StudentStatus;
  /** RLS: payments.view bo'lmasa 0 */
  balance: number;
  oldDebt: number;
  tags: { id: string; name: string; color: string | null }[];
  groups: StudentGroupRef[];
}

/** Sahifadagi talabalar uchun guruhlar va teglar */
async function enrich(
  supabase: Supabase,
  orgId: string,
  rows: {
    id: string | null;
    branch_id: string | null;
    full_name: string | null;
    phone: string | null;
    parent_phone: string | null;
    joined_at: string | null;
    status: string | null;
    tag_ids: string[] | null;
    balance: number | null;
    old_debt: number | null;
  }[],
): Promise<StudentListRow[]> {
  const ids = rows.map((r) => r.id!);
  const groups = new Map<string, StudentGroupRef[]>();
  const tags = new Map<string, StudentListRow["tags"][number]>();
  if (ids.length) {
    const [enrollments, tagRows] = await Promise.all([
      // Katta ro'yxat (eksport) uchun bo'laklab
      Promise.all(
        chunk(ids, 200).map(async (part) =>
          unwrap(
            await supabase
              .from("enrollments")
              .select(
                "student_id, status, group:groups ( id, name, weekdays, start_time, end_time, course:courses ( name ), teacher:staff ( profile:profiles ( full_name ) ) )",
              )
              .in("student_id", part)
              .neq("status", "left")
              .order("created_at"),
          ),
        ),
      ).then((r) => r.flat()),
      supabase.from("tags").select("id, name, color").eq("organization_id", orgId),
    ]);
    for (const e of enrollments) {
      if (!e.group) continue;
      const list = groups.get(e.student_id) ?? [];
      list.push({
        id: e.group.id,
        name: e.group.name,
        status: e.status as EnrollmentStatus,
        courseName: e.group.course?.name ?? "",
        teacherName: e.group.teacher?.profile?.full_name ?? null,
        weekdays: e.group.weekdays,
        startTime: e.group.start_time.slice(0, 5),
        endTime: e.group.end_time.slice(0, 5),
      });
      groups.set(e.student_id, list);
    }
    for (const t of unwrap(tagRows)) tags.set(t.id, t);
  }

  return rows.map((r) => ({
    id: r.id!,
    branchId: r.branch_id!,
    fullName: r.full_name!,
    phone: r.phone!,
    parentPhone: r.parent_phone,
    joinedAt: r.joined_at!,
    status: r.status as StudentStatus,
    balance: r.balance ?? 0,
    oldDebt: r.old_debt ?? 0,
    tags: (r.tag_ids ?? []).flatMap((id) => tags.get(id) ?? []),
    groups: groups.get(r.id!) ?? [],
  }));
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** branchId null — barcha filiallar */
export async function listStudents(
  orgId: string,
  branchId: string | null,
  p: StudentListFilters & { page: number },
): Promise<{ rows: StudentListRow[]; total: number; page: number; pages: number }> {
  const supabase = await createClient();
  const page = Math.max(1, p.page);
  const from = (page - 1) * STUDENTS_PAGE_SIZE;
  const res = await buildQuery(supabase, orgId, branchId, p).range(
    from,
    from + STUDENTS_PAGE_SIZE - 1,
  );
  // Sahifa raqami oxirgisidan katta bo'lsa PostgREST 416 qaytaradi — bo'sh ro'yxat
  if (res.error?.code === "PGRST103") {
    return { rows: [], total: 0, page, pages: 1 };
  }
  const rows = unwrap(res);
  const total = res.count ?? rows.length;
  return {
    rows: await enrich(supabase, orgId, rows),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE)),
  };
}

export const EXPORT_LIMIT = 10_000;

export async function listStudentsForExport(
  orgId: string,
  branchId: string | null,
  p: StudentListFilters,
): Promise<StudentListRow[]> {
  const supabase = await createClient();
  const rows: Awaited<ReturnType<typeof enrich>> = [];
  // PostgREST bitta so'rovda 1000 qatorgacha qaytaradi
  for (let from = 0; from < EXPORT_LIMIT; from += 1000) {
    const part = unwrap(await buildQuery(supabase, orgId, branchId, p).range(from, from + 999));
    rows.push(...(await enrich(supabase, orgId, part)));
    if (part.length < 1000) break;
  }
  return rows;
}

/** Filtrlar uchun ma'lumotnomalar */
export async function getStudentFilterOptions(orgId: string) {
  const supabase = await createClient();
  const [groups, courses, teachers, tags] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, branch_id")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("name"),
    supabase.from("courses").select("id, name").eq("organization_id", orgId).order("name"),
    supabase
      .from("staff")
      .select("id, profile:profiles ( full_name )")
      .eq("organization_id", orgId)
      .eq("is_teacher", true)
      .eq("is_active", true),
    supabase.from("tags").select("id, name, color").eq("organization_id", orgId).order("name"),
  ]);
  return {
    groups: unwrap(groups),
    courses: unwrap(courses),
    teachers: unwrap(teachers)
      .map((s) => ({ id: s.id, name: s.profile?.full_name ?? "—" }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tags: unwrap(tags),
  };
}

export type StudentFilterOptions = Awaited<ReturnType<typeof getStudentFilterOptions>>;
