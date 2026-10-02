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
