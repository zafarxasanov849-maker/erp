/** Davomat ko'rsatkichlari (PRD §6). Kataklar — o'tgan darslar × o'sha kuni a'zo (muzlatilmagan) talabalar. */
export interface AttendanceCounts {
  cells: number;
  marked: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  late_marked: number;
}

/** Foiz, bir xona aniqlikda; maxraj 0 bo'lsa null ("—"). */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

/**
 * Belgilangan % = belgilangan / kataklar.
 * Qatnashish % = (Keldi + Kechikdi) / belgilangan (belgilanmaganlar hisobga kirmaydi).
 */
export function attendanceRates(c: AttendanceCounts) {
  return {
    markedPct: percent(c.marked, c.cells),
    attendedPct: percent(c.present + c.late, c.marked),
  };
}
