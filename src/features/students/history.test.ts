import { describe, expect, it } from "vitest";

import { type HistoryEntry, type HistoryLookups, describeHistory } from "./history";

const lookups: HistoryLookups = {
  groups: { g1: "G1", g2: "G2" },
  tags: { t1: "VIP" },
  reasons: { r1: "Ko'chib ketdi" },
  branches: { b1: "Chilonzor" },
  enrollmentGroups: { e1: "g1", e2: "g2" },
};

const fmt = {
  date: (v: string) => v.split("-").reverse().join("."),
  dateTime: () => "DT",
  phone: (v: string) => `tel:${v}`,
  enrollmentStatus: (v: string) => `S:${v}`,
  gender: (v: string) => `G:${v}`,
};

function entry(partial: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 1,
    createdAt: "2026-10-02T10:00:00Z",
    action: "students.update",
    entity: "students",
    entityId: "s1",
    diff: {},
    actorName: "Aziz",
    ...partial,
  };
}

describe("describeHistory", () => {
  it("a'zolik qo'shilishi: guruh nomi, holat va sana", () => {
    const [item] = describeHistory(
      [
        entry({
          action: "enrollments.insert",
          entity: "enrollments",
          entityId: "e1",
          diff: { id: "e1", group_id: "g1", status: "trial", joined_at: "2026-09-10" },
        }),
      ],
      lookups,
      fmt,
    );
    expect(item).toMatchObject({
      action: "enrollments.insert",
      subject: "G1",
      changes: [
        { field: "status", from: null, to: "S:trial" },
        { field: "joined_at", from: null, to: "10.09.2026" },
      ],
    });
  });

  it("holat o'zgarishi va chiqish sababi nomi", () => {
    const [item] = describeHistory(
      [
        entry({
          action: "enrollments.update",
          entity: "enrollments",
          entityId: "e2",
          diff: {
            status: { old: "active", new: "left" },
            left_at: { old: null, new: "2026-10-02" },
            leave_reason_id: { old: null, new: "r1" },
          },
        }),
      ],
      lookups,
      fmt,
    );
    expect(item?.subject).toBe("G2");
    expect(item?.changes).toEqual([
      { field: "status", from: "S:active", to: "S:left" },
      { field: "left_at", from: null, to: "02.10.2026" },
      { field: "leave_reason_id", from: null, to: "Ko'chib ketdi" },
    ]);
  });

  it("muzlatish: guruh enrollment_id orqali topiladi", () => {
    const [item] = describeHistory(
      [
        entry({
          action: "freezes.insert",
          entity: "freezes",
          entityId: "f1",
          diff: {
            enrollment_id: "e1",
            date_from: "2026-10-05",
            date_to: "2026-10-20",
            reason_id: null,
          },
        }),
      ],
      lookups,
      fmt,
    );
    expect(item?.subject).toBe("G1");
    expect(item?.changes.map((c) => c.field)).toEqual(["date_from", "date_to"]);
  });

  it("profil o'zgarishi: telefon formatlanadi, texnik maydonlar yashiriladi", () => {
    const [item] = describeHistory(
      [
        entry({
          diff: {
            phone: { old: "+998901111111", new: "+998902222222" },
            created_at: { old: "a", new: "b" },
          },
        }),
      ],
      lookups,
      fmt,
    );
    expect(item?.changes).toEqual([
      { field: "phone", from: "tel:+998901111111", to: "tel:+998902222222" },
    ]);
  });

  it("faqat texnik maydon o'zgargan yozuv tushib qoladi", () => {
    expect(
      describeHistory([entry({ diff: { created_by: { old: "x", new: "y" } } })], lookups, fmt),
    ).toEqual([]);
  });

  it("teg va izoh: subject — teg nomi va qisqartirilgan matn", () => {
    const items = describeHistory(
      [
        entry({
          id: 1,
          action: "student_tags.insert",
          entity: "student_tags",
          diff: { tag_id: "t1" },
        }),
        entry({
          id: 2,
          action: "student_notes.insert",
          entity: "student_notes",
          diff: { body: "x".repeat(100) },
        }),
      ],
      lookups,
      fmt,
    );
    expect(items[0]?.subject).toBe("VIP");
    expect(items[1]?.subject).toHaveLength(81);
  });

  it("noma'lum amal — other", () => {
    const [item] = describeHistory([entry({ action: "foo.bar", entity: "foo" })], lookups, fmt);
    expect(item?.action).toBe("other");
  });
});
