import { CalendarCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/empty-state";
import { TagBadge } from "@/components/tag-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentAttendance } from "@/features/attendance/components/student-attendance";
import { getStudentAttendance } from "@/features/attendance/queries";
import { PaymentButton } from "@/features/billing/components/payment-dialog";
import { MoneyAmount, StudentLedger } from "@/features/billing/components/student-ledger";
import { getStudentLedger, summarizeLedger } from "@/features/billing/queries";
import { EnrollmentsPanel } from "@/features/students/components/enrollments-panel";
import { HistoryList } from "@/features/students/components/history-list";
import { NotesPanel } from "@/features/students/components/notes-panel";
import {
  StudentArchiveButton,
  StudentEditButton,
  StudentPhoto,
} from "@/features/students/components/student-profile-actions";
import { StudentStatusBadge } from "@/features/students/components/status-badge";
import { getStudentFormData } from "@/features/students/form-data";
import { describeHistory } from "@/features/students/history";
import {
  getStudent,
  getStudentHistory,
  listStudentEnrollments,
  listStudentNotes,
} from "@/features/students/profile";
import { can, canAny, requirePagePermission } from "@/lib/auth";
import { addDays, formatDate, formatDateTime, todayInTashkent } from "@/lib/dates";
import { formatPhone, toLocalPhoneInput } from "@/lib/phone";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("students") };
}

export default async function StudentPage({
  params,
}: {
  params: Promise<{ branchId: string; studentId: string }>;
}) {
  const { branchId, studentId } = await params;
  const ctx = await requirePagePermission("students.view");
  if (!UUID.test(studentId)) notFound();
  const orgId = ctx.membership.orgId;
  const student = await getStudent(orgId, studentId);
  if (!student) notFound();

  const canSeeAttendance = canAny(ctx, ["attendance.view", "attendance.manage"]);
  const canSeePayments = can(ctx, "payments.view");
  const [enrollments, notes, formData, attendance, ledger] = await Promise.all([
    listStudentEnrollments(student.id),
    listStudentNotes(student.id),
    getStudentFormData(),
    canSeeAttendance
      ? getStudentAttendance(student.id, addDays(todayInTashkent(), -92))
      : Promise.resolve([]),
    canSeePayments ? getStudentLedger(student.id) : Promise.resolve([]),
  ]);
  const money = summarizeLedger(ledger, todayInTashkent().slice(0, 7));
  const history = await getStudentHistory(orgId, student.id, enrollments);

  const t = await getTranslations("students");
  const today = todayInTashkent();
  const canUpdate = can(ctx, "students.update");
  const archived = student.archived_at !== null;
  const branchPath = `/${branchId}`;
  const data = formData.ok
    ? formData.data
    : { groups: [], tags: [], branches: [], leaveReasons: [], freezeReasons: [] };

  const items = describeHistory(history.entries, history.lookups, {
    date: formatDate,
    dateTime: formatDateTime,
    phone: formatPhone,
    enrollmentStatus: (s) =>
      t.has(`enrollmentStatuses.${s}` as "enrollmentStatuses.active")
        ? t(`enrollmentStatuses.${s}` as "enrollmentStatuses.active")
        : s,
    gender: (g) => (t.has(`gender.${g}` as "gender.male") ? t(`gender.${g}` as "gender.male") : g),
  });

  const info: [string, string | null][] = [
    [t("fields.parentName"), student.parent_name],
    [t("fields.parentPhone"), student.parent_phone ? formatPhone(student.parent_phone) : null],
    [t("fields.birthDate"), student.birth_date ? formatDate(student.birth_date) : null],
    [t("fields.gender"), student.gender ? t(`gender.${student.gender}`) : null],
    [t("fields.telegram"), student.telegram_username ? `@${student.telegram_username}` : null],
    [t("fields.school"), student.school],
    [t("fields.address"), student.address],
    [t("fields.passportSeries"), student.passport_series],
  ];
  const filledInfo = info.filter((x): x is [string, string] => Boolean(x[1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <StudentPhoto
            studentId={student.id}
            url={student.photoUrl}
            name={student.full_name}
            editable={canUpdate && !archived}
          />
          <div className="space-y-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              {student.full_name}
              <StudentStatusBadge status={student.status} />
            </h1>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <a href={`tel:${student.phone}`} className="tabular-nums hover:underline">
                {formatPhone(student.phone)}
              </a>
              <span>{student.branch?.name}</span>
              <span>{t("profile.joined", { date: formatDate(student.joined_at) })}</span>
              {canSeePayments && (
                <span data-testid="header-balance">
                  <MoneyAmount value={money.balance} className="font-medium" />
                </span>
              )}
            </div>
            {student.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {student.tags.map((tag) => (
                  <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                ))}
              </div>
            )}
            <Link
              href={`${branchPath}/students`}
              className="block pt-1 text-sm text-muted-foreground hover:underline"
            >
              ← {t("profile.backToList")}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(ctx, "payments.create") && (
            <PaymentButton studentId={student.id} label={t("profile.pay")} />
          )}
          {canUpdate && !archived && (
            <StudentEditButton
              branchId={branchId}
              tags={data.tags}
              defaults={{
                id: student.id,
                tagIds: student.tags.map((x) => x.id),
                fullName: student.full_name,
                phone: toLocalPhoneInput(student.phone),
                gender: student.gender ?? "",
                birthDate: student.birth_date ? formatDate(student.birth_date) : "",
                parentName: student.parent_name ?? "",
                parentPhone: toLocalPhoneInput(student.parent_phone),
                telegram: student.telegram_username ?? "",
                address: student.address ?? "",
                school: student.school ?? "",
                passportSeries: student.passport_series ?? "",
              }}
            />
          )}
          {can(ctx, "students.delete") && (
            <StudentArchiveButton
              studentId={student.id}
              name={student.full_name}
              archived={archived}
            />
          )}
        </div>
      </div>

      {archived && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          {t("profile.archivedBanner")} · {formatDateTime(student.archived_at!)}
        </p>
      )}

      {filledInfo.length > 0 && (
        <dl className="grid gap-x-6 gap-y-3 rounded-lg border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {filledInfo.map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Tabs defaultValue="groups">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="groups">{t("profile.tabs.groups")}</TabsTrigger>
          <TabsTrigger value="payments">{t("profile.tabs.payments")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("profile.tabs.attendance")}</TabsTrigger>
          <TabsTrigger value="notes">{t("profile.tabs.notes")}</TabsTrigger>
          <TabsTrigger value="history">{t("profile.tabs.history")}</TabsTrigger>
        </TabsList>
        <TabsContent value="groups" className="pt-2">
          <EnrollmentsPanel
            studentId={student.id}
            branchPath={branchPath}
            enrollments={enrollments}
            groups={data.groups}
            leaveReasons={data.leaveReasons}
            freezeReasons={data.freezeReasons}
            todayIso={today}
            canUpdate={canUpdate}
            canDiscount={can(ctx, "discounts.manage")}
            archived={archived}
          />
        </TabsContent>
        <TabsContent value="payments" className="pt-2">
          {canSeePayments ? (
            <StudentLedger
              rows={ledger}
              balance={money.balance}
              oldDebt={money.oldDebt}
              debtSince={money.debtSince}
              canVoid={can(ctx, "payments.void")}
              branchPath={branchPath}
            />
          ) : (
            <EmptyState icon={Wallet} title={t("profile.tabs.payments")} />
          )}
        </TabsContent>
        <TabsContent value="attendance" className="pt-2">
          {canSeeAttendance ? (
            <StudentAttendance rows={attendance} />
          ) : (
            <EmptyState icon={CalendarCheck} title={t("profile.tabs.attendance")} />
          )}
        </TabsContent>
        <TabsContent value="notes" className="pt-2">
          <NotesPanel
            studentId={student.id}
            notes={notes}
            canAdd={canUpdate}
            staffId={ctx.membership.staffId}
          />
        </TabsContent>
        <TabsContent value="history" className="pt-2">
          <HistoryList items={items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
