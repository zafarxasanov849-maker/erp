"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { type CourseValues, courseSchema } from "./schema";

export async function saveCourse(input: CourseValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.catalogs");
    const values = parseInput(courseSchema, input);
    const orgId = ctx.membership.orgId;
    const supabase = await createClient();
    const row = {
      name: values.name,
      monthly_price: values.monthlyPrice,
      lesson_minutes: values.lessonMinutes,
      is_active: values.isActive,
    };
    if (values.id) {
      const updated = unwrap(
        await supabase
          .from("courses")
          .update(row)
          .eq("id", values.id)
          .eq("organization_id", orgId)
          .select("id"),
      );
      if (updated.length !== 1) throw new ActionError("errors.notFound");
    } else {
      unwrap(await supabase.from("courses").insert({ ...row, organization_id: orgId }));
    }
    revalidatePath("/", "layout");
    return null;
  });
}
