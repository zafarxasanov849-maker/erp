"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { onEnrollmentsChanged } from "@/features/billing/events";
import { LOGO_MAX_BYTES, LOGO_TYPES } from "@/features/organization/schema";
import { createClient } from "@/lib/supabase/server";
import { toE164, toIsoDate } from "@/lib/validation";

import {
  type ActivateValues,
  type EnrollValues,
  type FreezeValues,
  type LeaveValues,
  type NoteValues,
  type StudentCreateValues,
  type StudentUpdateValues,
  type TransferValues,
  activateSchema,
  enrollSchema,
  freezeSchema,
  leaveSchema,
  normalizeTelegram,
  noteSchema,
  studentCreateSchema,
  studentUpdateSchema,
  transferSchema,
} from "./schema";

const PHOTO_BUCKET = "student-photos";

function profileRow(v: {
  fullName: string;
  phone: string;
  gender: "male" | "female" | "";
  birthDate: string;
  parentName: string;
  parentPhone: string;
  telegram: string;
  address: string;
  school: string;
  passportSeries: string;
}) {
  return {
    full_name: v.fullName,
    phone: toE164(v.phone),
    gender: v.gender || null,
    birth_date: v.birthDate ? toIsoDate(v.birthDate) : null,
    parent_name: v.parentName || null,
    parent_phone: v.parentPhone ? toE164(v.parentPhone) : null,
    telegram_username: normalizeTelegram(v.telegram),
    address: v.address || null,
    school: v.school || null,
    passport_series: v.passportSeries || null,
  };
}

export async function createStudent(
  input: StudentCreateValues,
): Promise<ActionResult<{ studentId: string }>> {
  return runAction(async () => {
    const ctx = await requirePermission("students.create");
    const v = parseInput(studentCreateSchema, input);
    if (!ctx.membership.allBranches && !ctx.branches.some((b) => b.id === v.branchId)) {
      throw new ActionError("errors.forbidden");
    }
    const supabase = await createClient();
    const result = unwrap(
      await supabase.rpc("create_student", {
        p: {
          branch_id: v.branchId,
          joined_at: toIsoDate(v.joinedAt),
          tag_ids: v.tagIds,
          enrollments: v.enrollments.map((e) => ({
            group_id: e.groupId,
            status: e.status,
            date: toIsoDate(e.date),
          })),
          ...profileRow(v),
        },
      }),
    ) as { student_id: string; enrollments: { id: string; status: string; date: string }[] };

    const activated = result.enrollments.filter((e) => e.status === "active").map((e) => e.id);
    if (activated.length)
      await onEnrollmentsChanged(activated, "activation", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return { studentId: result.student_id };
  });
}

export async function updateStudent(input: StudentUpdateValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const v = parseInput(studentUpdateSchema, input);
    const supabase = await createClient();
    const updated = unwrap(
      await supabase
        .from("students")
        .update(profileRow(v))
        .eq("id", v.id)
        .eq("organization_id", ctx.membership.orgId)
        .select("id"),
    );
    if (updated.length !== 1) throw new ActionError("errors.notFound");

    // Teglar: farqini qo'llash
    const current = unwrap(
      await supabase.from("student_tags").select("tag_id").eq("student_id", v.id),
    );
    const have = new Set(current.map((r) => r.tag_id));
    const want = new Set(v.tagIds);
    const add = [...want].filter((t) => !have.has(t));
    const remove = [...have].filter((t) => !want.has(t));
    if (add.length) {
      unwrap(
        await supabase
          .from("student_tags")
          .insert(add.map((tag_id) => ({ student_id: v.id, tag_id }))),
      );
    }
    if (remove.length) {
      unwrap(
        await supabase.from("student_tags").delete().eq("student_id", v.id).in("tag_id", remove),
      );
    }
    revalidatePath("/", "layout");
    return null;
  });
}

/** Ro'yxatdan ommaviy teg qo'shish */
export async function addTagToStudents(
  studentIds: string[],
  tagId: string,
): Promise<ActionResult<{ added: number }>> {
  return runAction(async () => {
    await requirePermission("students.update");
    if (studentIds.length === 0 || studentIds.length > 500)
      throw new ActionError("errors.validation");
    const supabase = await createClient();
    const rows = unwrap(
      await supabase
        .from("student_tags")
        .upsert(
          studentIds.map((student_id) => ({ student_id, tag_id: tagId })),
          {
            onConflict: "student_id,tag_id",
            ignoreDuplicates: true,
          },
        )
        .select("student_id"),
    );
    revalidatePath("/", "layout");
    return { added: rows.length };
  });
}

export async function enrollStudent(input: EnrollValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const v = parseInput(enrollSchema, input);
    const date = toIsoDate(v.date);
    const supabase = await createClient();
    const id = unwrap(
      await supabase.rpc("enroll_student", {
        p_student: v.studentId,
        p_group: v.groupId,
        p_status: v.status,
        p_date: date,
      }),
    );
    if (v.status === "active")
      await onEnrollmentsChanged([id], "activation", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function activateEnrollment(input: ActivateValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const v = parseInput(activateSchema, input);
    const date = toIsoDate(v.date);
    const supabase = await createClient();
    unwrap(
      await supabase.rpc("activate_enrollment", { p_enrollment: v.enrollmentId, p_date: date }),
    );
    await onEnrollmentsChanged([v.enrollmentId], "activation", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function leaveEnrollment(input: LeaveValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const v = parseInput(leaveSchema, input);
    const date = toIsoDate(v.date);
    const supabase = await createClient();
    unwrap(
      await supabase.rpc("leave_enrollment", {
        p_enrollment: v.enrollmentId,
        p_date: date,
        p_reason: v.reasonId,
      }),
    );
    await onEnrollmentsChanged([v.enrollmentId], "leave", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function transferEnrollment(input: TransferValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const v = parseInput(transferSchema, input);
    const date = toIsoDate(v.date);
    const supabase = await createClient();
    const newId = unwrap(
      await supabase.rpc("transfer_enrollment", {
        p_enrollment: v.enrollmentId,
        p_new_group: v.groupId,
        p_date: date,
        p_reason: (v.reasonId || null) as string,
      }),
    );
    await onEnrollmentsChanged([v.enrollmentId], "leave", ctx.membership.staffId);
    await onEnrollmentsChanged([newId], "activation", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function freezeEnrollment(input: FreezeValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const v = parseInput(freezeSchema, input);
    const supabase = await createClient();
    unwrap(
      await supabase.rpc("freeze_enrollment", {
        p_enrollment: v.enrollmentId,
        p_from: toIsoDate(v.from),
        p_to: toIsoDate(v.to),
        p_reason: (v.reasonId || null) as string,
      }),
    );
    await onEnrollmentsChanged([v.enrollmentId], "freeze", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function endFreeze(freezeId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const supabase = await createClient();
    // Boshlanmagan muzlatish o'chiriladi — a'zolikni oldindan olib qo'yamiz
    const freeze = unwrap(
      await supabase.from("freezes").select("enrollment_id").eq("id", freezeId).maybeSingle(),
    );
    unwrap(await supabase.rpc("end_freeze", { p_freeze: freezeId }));
    if (freeze)
      await onEnrollmentsChanged([freeze.enrollment_id], "freeze", ctx.membership.staffId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function setStudentArchived(
  studentId: string,
  archived: boolean,
): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("students.delete");
    const supabase = await createClient();
    unwrap(
      await supabase.rpc("set_student_archived", { p_student: studentId, p_archived: archived }),
    );
    revalidatePath("/", "layout");
    return null;
  });
}

export async function addNote(input: NoteValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const v = parseInput(noteSchema, input);
    const supabase = await createClient();
    unwrap(
      await supabase.from("student_notes").insert({
        organization_id: ctx.membership.orgId,
        student_id: v.studentId,
        body: v.body,
        created_by: ctx.membership.staffId,
      }),
    );
    revalidatePath("/", "layout");
    return null;
  });
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requirePermission("students.update");
    const supabase = await createClient();
    const deleted = unwrap(
      await supabase.from("student_notes").delete().eq("id", noteId).select("id"),
    );
    if (deleted.length !== 1) throw new ActionError("errors.forbidden");
    revalidatePath("/", "layout");
    return null;
  });
}

/** Talaba rasmi: yopiq bucket, yo'l <org>/<student>/<fayl> (Storage RLS: can_edit_student) */
export async function uploadStudentPhoto(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const studentId = String(formData.get("studentId") ?? "");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError("validation.required");
    const ext = LOGO_TYPES[file.type];
    if (!ext) throw new ActionError("errors.logo.type");
    if (file.size > LOGO_MAX_BYTES) throw new ActionError("errors.logo.size");

    const supabase = await createClient();
    const student = unwrap(
      await supabase
        .from("students")
        .select("id, photo_url")
        .eq("id", studentId)
        .eq("organization_id", ctx.membership.orgId)
        .maybeSingle(),
    );
    if (!student) throw new ActionError("errors.notFound");

    const path = `${ctx.membership.orgId}/${student.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[student-photo]", error);
      throw new ActionError("errors.logo.upload");
    }
    unwrap(await supabase.from("students").update({ photo_url: path }).eq("id", student.id));
    if (student.photo_url) await supabase.storage.from(PHOTO_BUCKET).remove([student.photo_url]);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function removeStudentPhoto(studentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("students.update");
    const supabase = await createClient();
    const student = unwrap(
      await supabase
        .from("students")
        .select("id, photo_url")
        .eq("id", studentId)
        .eq("organization_id", ctx.membership.orgId)
        .maybeSingle(),
    );
    if (!student) throw new ActionError("errors.notFound");
    unwrap(await supabase.from("students").update({ photo_url: null }).eq("id", student.id));
    if (student.photo_url) await supabase.storage.from(PHOTO_BUCKET).remove([student.photo_url]);
    revalidatePath("/", "layout");
    return null;
  });
}
