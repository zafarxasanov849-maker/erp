import { describe, expect, it } from "vitest";

import { attendanceRates, percent } from "./rates";

const counts = { cells: 10, marked: 8, present: 5, late: 1, absent: 1, excused: 1, late_marked: 0 };

describe("attendanceRates", () => {
  it("belgilangan va qatnashish foizi", () => {
    expect(attendanceRates(counts)).toEqual({ markedPct: 80, attendedPct: 75 });
  });
  it("Sababli qatnashishga kirmaydi, lekin belgilangan", () => {
    expect(attendanceRates({ ...counts, marked: 1, present: 0, late: 0, excused: 1 })).toEqual({
      markedPct: 10,
      attendedPct: 0,
    });
  });
  it("darslar yo'q — null", () => {
    expect(
      attendanceRates({
        ...counts,
        cells: 0,
        marked: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
      }),
    ).toEqual({ markedPct: null, attendedPct: null });
  });
});

describe("percent", () => {
  it("bir xona aniqlik", () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(2, 3)).toBe(66.7);
    expect(percent(0, 0)).toBeNull();
  });
});
