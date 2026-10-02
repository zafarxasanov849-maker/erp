import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { LessonMarking } from "@/features/attendance/components/lesson-marking";
import { getJournal, getLesson } from "@/features/attendance/queries";
import { can, requirePagePermission } from "@/lib/auth";
import { formatDate } from "@/lib/dates";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("today") };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ branchId: string; lessonId: string }>;
}) {
  const { branchId, lessonId } = await params;
  const ctx = await requirePagePermission(["attendance.view", "attendance.manage"]);
  if (!UUID.test(lessonId)) notFound();
  const row = await getLesson(lessonId);
  if (!row?.group) notFound();
  const journal = await getJournal(row.group_id, row.date, row.date);
  const lesson = journal.lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound();

  const t = await getTranslations("attendance.lesson");
  const base = `/${branchId}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1">
        <Link href={`${base}/today`} className="text-sm text-muted-foreground hover:underline">
          ← {t("backToToday")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{row.group.name}</h1>
        <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {formatDate(lesson.date)} · {lesson.startTime}–{lesson.endTime}
          </span>
          {can(ctx, "groups.view") && (
            <Link
              href={`${base}/groups/${row.group.id}?tab=attendance&month=${lesson.date.slice(0, 7)}`}
              className="hover:underline"
            >
              {t("journal")}
            </Link>
          )}
        </p>
      </div>
      <LessonMarking journal={journal} lesson={lesson} />
    </div>
  );
}
