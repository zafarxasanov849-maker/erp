import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatTime,
  isIsoDate,
  monthKey,
  parseUiDate,
  todayInTashkent,
} from "./dates";

describe("formatDate", () => {
  it("bazadagi date satrini vaqt zonasisiz KK.OO.YYYY ga", () => {
    expect(formatDate("2026-10-02")).toBe("02.10.2026");
    expect(formatDate("2024-02-29")).toBe("29.02.2024");
  });

  it("timestamptz ni Toshkent vaqtida ko'rsatadi", () => {
    // 19:30 UTC = keyingi kun 00:30 Toshkent (UTC+5)
    expect(formatDate("2026-10-01T19:30:00Z")).toBe("02.10.2026");
    expect(formatDate(new Date("2026-10-01T18:59:59Z"))).toBe("01.10.2026");
  });

  it("mavjud bo'lmagan sana xato beradi", () => {
    expect(() => formatDate("2026-02-30")).toThrow(RangeError);
    expect(() => formatDate("not a date")).toThrow(RangeError);
  });
});

describe("formatTime", () => {
  it("bazadagi time ustuni", () => {
    expect(formatTime("14:30:00")).toBe("14:30");
    expect(formatTime("09:05")).toBe("09:05");
  });

  it("timestamptz → Toshkent soati", () => {
    expect(formatTime("2026-10-02T07:15:00Z")).toBe("12:15");
  });
});

describe("formatDateTime", () => {
  it("KK.OO.YYYY HH:mm", () => {
    expect(formatDateTime("2026-10-02T04:05:00Z")).toBe("02.10.2026 09:05");
  });
});

describe("parseUiDate", () => {
  it("KK.OO.YYYY → YYYY-MM-DD", () => {
    expect(parseUiDate("02.10.2026")).toBe("2026-10-02");
    expect(parseUiDate(" 29.02.2024 ")).toBe("2024-02-29");
  });

  it("noto'g'ri sana → null", () => {
    expect(parseUiDate("29.02.2026")).toBeNull();
    expect(parseUiDate("32.01.2026")).toBeNull();
    expect(parseUiDate("2.10.2026")).toBeNull();
    expect(parseUiDate("2026-10-02")).toBeNull();
    expect(parseUiDate("")).toBeNull();
  });

  it("formatDate bilan aylana", () => {
    expect(parseUiDate(formatDate("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("todayInTashkent", () => {
  it("UTC kechqurun Toshkentda allaqachon ertangi kun", () => {
    expect(todayInTashkent(new Date("2026-09-30T19:05:00Z"))).toBe("2026-10-01");
    expect(todayInTashkent(new Date("2026-09-30T18:59:00Z"))).toBe("2026-09-30");
  });
});

describe("monthKey", () => {
  it("ISO sanadan", () => {
    expect(monthKey("2026-10-02")).toBe("2026-10");
  });

  it("Date dan Toshkent bo'yicha", () => {
    // 31-dekabr 19:05 UTC = 1-yanvar 00:05 Toshkent — cron oylik yechish vaqti
    expect(monthKey(new Date("2026-12-31T19:05:00Z"))).toBe("2027-01");
  });

  it("noto'g'ri satr xato beradi", () => {
    expect(() => monthKey("2026-13-01")).toThrow(RangeError);
  });
});

describe("isIsoDate", () => {
  it("kabisa yili", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2025-02-29")).toBe(false);
  });
});
