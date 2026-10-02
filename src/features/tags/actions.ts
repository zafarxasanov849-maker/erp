"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { type TagValues, tagSchema } from "./schema";

export async function saveTag(input: TagValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.catalogs");
    const values = parseInput(tagSchema, input);
    const orgId = ctx.membership.orgId;
    const supabase = await createClient();
    const row = { name: values.name, color: values.color };
    if (values.id) {
      const updated = unwrap(
        await supabase
          .from("tags")
          .update(row)
          .eq("id", values.id)
          .eq("organization_id", orgId)
          .select("id"),
      );
      if (updated.length !== 1) throw new ActionError("errors.notFound");
    } else {
      unwrap(await supabase.from("tags").insert({ ...row, organization_id: orgId }));
    }
    revalidatePath("/", "layout");
    return null;
  });
}

/** Teg o'chirilsa, talabalardan ham olib tashlanadi (student_tags on delete cascade). */
export async function deleteTag(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.catalogs");
    const supabase = await createClient();
    const deleted = unwrap(
      await supabase
        .from("tags")
        .delete()
        .eq("id", id)
        .eq("organization_id", ctx.membership.orgId)
        .select("id"),
    );
    if (deleted.length !== 1) throw new ActionError("errors.notFound");
    revalidatePath("/", "layout");
    return null;
  });
}
