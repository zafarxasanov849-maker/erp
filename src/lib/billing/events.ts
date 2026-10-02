import "server-only";

/**
 * Hisob-kitobga ta'sir qiluvchi hodisalar. 5-bosqichda (PRD §5.7) bu yerga pul qaytarish ulanadi:
 * oy uchun yechilgan bo'lsa, har bekor dars uchun narx / darslar_to'liq_oyda qaytariladi.
 * Hozircha hech narsa qilmaydi — chaqiriladigan joylar tayyor.
 */
export async function onLessonsCancelled(lessonIds: readonly string[]): Promise<void> {
  void lessonIds; // TODO(5-bosqich): holidayAdjustment
}

export async function onLessonsRestored(lessonIds: readonly string[]): Promise<void> {
  void lessonIds; // TODO(5-bosqich): qaytarilgan summani teskari yozuv bilan bekor qilish
}

/** PRD §5.3: oy o'rtasida faollashganda qolgan darslar uchun darhol yechish. */
export async function onEnrollmentActivated(enrollmentId: string, date: string): Promise<void> {
  void enrollmentId;
  void date; // TODO(5-bosqich): activationCharge
}

/** PRD §5.5: muzlatilgan oraliq uchun allaqachon yechilgan bo'lsa qaytarish. */
export async function onEnrollmentFrozen(freezeId: string): Promise<void> {
  void freezeId; // TODO(5-bosqich): freezeAdjustment
}

/** PRD §5.6: chiqqan sanadan keyingi darslar ulushini qaytarish (sozlamaga qarab). */
export async function onEnrollmentLeft(enrollmentId: string, date: string): Promise<void> {
  void enrollmentId;
  void date; // TODO(5-bosqich): leaveAdjustment
}

/**
 * Davomat saqlangach (pulga ta'sir qilmaydi — PRD §5). 9-bosqich: kelmagan talaba ota-onasiga xabar
 * (Telegram yoki SMS, sozlamaga qarab) shu yerdan yuboriladi.
 */
export async function onAttendanceMarked(
  lessonId: string,
  absentEnrollmentIds: string[],
): Promise<void> {
  void lessonId;
  void absentEnrollmentIds; // TODO(9-bosqich): ota-onaga xabar
}
