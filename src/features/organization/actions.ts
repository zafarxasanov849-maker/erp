"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { LOGO_MAX_BYTES, LOGO_TYPES, type OrganizationValues, organizationSchema } from "./schema";

const BUCKET = "org-assets";

export async function updateOrganization(input: OrganizationValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.organization");
    const values = parseInput(organizationSchema, input);
    const supabase = await createClient();
    const rows = unwrap(
      await supabase
        .from("organizations")
        .update({
          name: values.name,
          primary_color: values.primaryColor,
          work_start: values.workStart,
          work_end: values.workEnd,
        })
        .eq("id", ctx.membership.orgId)
        .select("id"),
    );
    if (rows.length !== 1) throw new ActionError("errors.forbidden");
    revalidatePath("/", "layout");
    return null;
  });
}

export async function uploadLogo(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.organization");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError("validation.required");
    const ext = LOGO_TYPES[file.type];
    if (!ext) throw new ActionError("errors.logo.type");
    if (file.size > LOGO_MAX_BYTES) throw new ActionError("errors.logo.size");

    const supabase = await createClient();
    const orgId = ctx.membership.orgId;
    // Storage RLS: yo'lning birinchi qismi — markaz id (settings.organization tekshiriladi).
    const path = `${orgId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("[logo]", error);
      throw new ActionError("errors.logo.upload");
    }
    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    const previous = ctx.membership.orgLogo;
    unwrap(await supabase.from("organizations").update({ logo_url: publicUrl }).eq("id", orgId));
    await removeStoredLogo(previous, orgId);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function removeLogo(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.organization");
    const supabase = await createClient();
    unwrap(
      await supabase
        .from("organizations")
        .update({ logo_url: null })
        .eq("id", ctx.membership.orgId),
    );
    await removeStoredLogo(ctx.membership.orgLogo, ctx.membership.orgId);
    revalidatePath("/", "layout");
    return null;
  });
}

async function removeStoredLogo(url: string | null, orgId: string) {
  const marker = `/${BUCKET}/`;
  const idx = url?.indexOf(marker) ?? -1;
  if (!url || idx < 0) return;
  const path = url.slice(idx + marker.length);
  if (!path.startsWith(`${orgId}/`)) return;
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([path]);
}
