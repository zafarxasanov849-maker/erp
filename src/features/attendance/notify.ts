import "server-only";

/**
 * Davomat saqlangach. 9-bosqich: kelmagan talaba ota-onasiga xabar (Telegram yoki SMS, sozlamaga qarab).
 */
export async function onAttendanceMarked(
  lessonId: string,
  absentEnrollmentIds: string[],
): Promise<void> {
  void lessonId;
  void absentEnrollmentIds; // TODO(9-bosqich): ota-onaga xabar
}
