/**
 * Talaba tarixini (audit_log) o'qiladigan ko'rinishga keltirish — toza funksiya, testlar bilan.
 * Tarjima va formatlash tashqaridan beriladi (`fmt`), shuning uchun server va testda bir xil ishlaydi.
 */

export interface HistoryEntry {
  id: number;
  createdAt: string;
  /** "enrollments.update" */
  action: string;
  entity: string;
  entityId: string | null;
  /** insert/delete — butun qator; update — { field: { old, new } } */
  diff: Record<string, unknown>;
  actorName: string | null;
}

export interface HistoryLookups {
  groups: Record<string, string>;
  tags: Record<string, string>;
  reasons: Record<string, string>;
  branches: Record<string, string>;
  /** enrollment id → group id (eski yozuvlarda diff'da group_id bo'lmasligi mumkin) */
  enrollmentGroups: Record<string, string>;
}

export interface HistoryFormatters {
  date: (iso: string) => string;
  dateTime: (iso: string) => string;
  phone: (e164: string) => string;
  enrollmentStatus: (status: string) => string;
  gender: (gender: string) => string;
}

export interface HistoryChange {
  /** students.history.fields.<field> */
  field: string;
  from: string | null;
  to: string | null;
}

export interface HistoryItem {
  id: number;
  createdAt: string;
  actorName: string | null;
  /** students.history.actions.<action> ("other" — noma'lum amal) */
  action: string;
  /** Guruh nomi, teg nomi yoki izoh matni */
  subject: string | null;
  changes: HistoryChange[];
}

export const KNOWN_HISTORY_ACTIONS = [
  "students.insert",
  "students.update",
  "students.delete",
  "enrollments.insert",
  "enrollments.update",
  "enrollments.delete",
  "freezes.insert",
  "freezes.update",
  "freezes.delete",
  "student_tags.insert",
  "student_tags.delete",
  "student_notes.insert",
  "student_notes.update",
  "student_notes.delete",
] as const;

/** Ko'rsatilmaydigan texnik maydonlar */
const HIDDEN_FIELDS = new Set([
  "id",
  "organization_id",
  "student_id",
  "enrollment_id",
  "created_at",
  "created_by",
  "user_id",
  "parent_telegram_id",
  "price_override",
]);

/** Yangi yozuvda ko'rsatiladigan maydonlar (qolgani — shovqin) */
const INSERT_FIELDS: Record<string, readonly string[]> = {
  enrollments: ["status", "joined_at"],
  freezes: ["date_from", "date_to", "reason_id"],
};

const DATE_FIELDS = new Set([
  "birth_date",
  "joined_at",
  "activated_at",
  "left_at",
  "date_from",
  "date_to",
]);

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return typeof v === "string" ? v : JSON.stringify(v);
}

function formatValue(
  field: string,
  value: unknown,
  lookups: HistoryLookups,
  fmt: HistoryFormatters,
): string | null {
  const v = str(value);
  if (v === null) return null;
  if (DATE_FIELDS.has(field)) return fmt.date(v);
  switch (field) {
    case "archived_at":
      return fmt.dateTime(v);
    case "phone":
    case "parent_phone":
      return fmt.phone(v);
    case "status":
      return fmt.enrollmentStatus(v);
    case "gender":
      return fmt.gender(v);
    case "group_id":
      return lookups.groups[v] ?? null;
    case "branch_id":
      return lookups.branches[v] ?? null;
    case "tag_id":
      return lookups.tags[v] ?? null;
    case "reason_id":
    case "leave_reason_id":
      return lookups.reasons[v] ?? null;
    case "photo_url":
      return "•";
    default:
      return v;
  }
}

function subjectOf(entry: HistoryEntry, lookups: HistoryLookups): string | null {
  const d = entry.diff;
  const value = (key: string): string | null => {
    const raw = d[key];
    if (raw && typeof raw === "object" && "new" in raw) {
      return str((raw as { new: unknown }).new) ?? str((raw as { old?: unknown }).old);
    }
    return str(raw);
  };
  switch (entry.entity) {
    case "enrollments": {
      const groupId =
        value("group_id") ?? (entry.entityId ? lookups.enrollmentGroups[entry.entityId] : null);
      return groupId ? (lookups.groups[groupId] ?? null) : null;
    }
    case "freezes": {
      const enrollmentId = value("enrollment_id");
      const groupId = enrollmentId ? lookups.enrollmentGroups[enrollmentId] : null;
      return groupId ? (lookups.groups[groupId] ?? null) : null;
    }
    case "student_tags": {
      const tagId = value("tag_id");
      return tagId ? (lookups.tags[tagId] ?? null) : null;
    }
    case "student_notes": {
      const body = value("body");
      return body && body.length > 80 ? `${body.slice(0, 80)}…` : body;
    }
    default:
      return null;
  }
}

export function describeHistory(
  entries: readonly HistoryEntry[],
  lookups: HistoryLookups,
  fmt: HistoryFormatters,
): HistoryItem[] {
  return entries
    .map((entry) => {
      const op = entry.action.split(".")[1];
      const changes: HistoryChange[] = [];

      if (op === "update") {
        for (const [field, change] of Object.entries(entry.diff)) {
          if (HIDDEN_FIELDS.has(field) || !change || typeof change !== "object") continue;
          const { old: from, new: to } = change as { old: unknown; new: unknown };
          changes.push({
            field,
            from: formatValue(field, from, lookups, fmt),
            to: formatValue(field, to, lookups, fmt),
          });
        }
      } else if (op === "insert") {
        for (const field of INSERT_FIELDS[entry.entity] ?? []) {
          const to = formatValue(field, entry.diff[field], lookups, fmt);
          if (to !== null) changes.push({ field, from: null, to });
        }
      }

      // Faqat texnik maydonlar o'zgargan yangilanish — ko'rsatilmaydi
      if (op === "update" && changes.length === 0) return null;

      return {
        id: entry.id,
        createdAt: entry.createdAt,
        actorName: entry.actorName,
        action: (KNOWN_HISTORY_ACTIONS as readonly string[]).includes(entry.action)
          ? entry.action
          : "other",
        subject: subjectOf(entry, lookups),
        changes,
      };
    })
    .filter((x): x is HistoryItem => x !== null);
}
