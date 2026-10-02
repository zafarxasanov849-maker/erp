import {
  createLoader,
  createParser,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { isIsoDate } from "@/lib/dates";

import { STUDENT_STATUSES } from "./schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const parseAsUuid = createParser({
  parse: (v) => (UUID.test(v) ? v : null),
  serialize: (v: string) => v,
});

const parseAsIso = createParser({
  parse: (v) => (isIsoDate(v) ? v : null),
  serialize: (v: string) => v,
});

export const STUDENT_SORTS = ["name", "joined", "created", "balance"] as const;

/** Holat filtri: holatlar + "Qarzdorlar" (faol, balans < 0) va "Sinov muddati o'tdi" (§5.4) */
export const STUDENT_STATUS_FILTERS = [...STUDENT_STATUSES, "debtor", "trial_expired"] as const;
export type StudentStatusFilter = (typeof STUDENT_STATUS_FILTERS)[number];
export type StudentSort = (typeof STUDENT_SORTS)[number];

export const STUDENTS_PAGE_SIZE = 50;

/** Talabalar ro'yxati filtrlari — URL'da (nuqs), server va klientda bir xil. */
export const studentSearchParams = {
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(STUDENT_STATUS_FILTERS),
  group: parseAsUuid,
  course: parseAsUuid,
  teacher: parseAsUuid,
  tag: parseAsUuid,
  branch: parseAsUuid,
  from: parseAsIso,
  to: parseAsIso,
  sort: parseAsStringLiteral(STUDENT_SORTS).withDefault("created"),
  dir: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
};

export const loadStudentSearchParams = createLoader(studentSearchParams);

export type StudentListParams = Awaited<ReturnType<typeof loadStudentSearchParams>>;

/** Sahifa va saralashsiz filtrlar (eksport uchun) */
export type StudentListFilters = Omit<StudentListParams, "page">;

export function hasStudentFilters(p: StudentListFilters): boolean {
  return Boolean(
    p.q || p.status || p.group || p.course || p.teacher || p.tag || p.branch || p.from || p.to,
  );
}
