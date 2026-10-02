"use server";

import { revalidatePath } from "next/cache";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { type RoomValues, roomSchema } from "./schema";

export async function saveRoom(input: RoomValues): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.catalogs");
    const values = parseInput(roomSchema, input);
    const orgId = ctx.membership.orgId;
    const supabase = await createClient();
    const row = { branch_id: values.branchId, name: values.name, capacity: values.capacity };
    if (values.id) {
      const updated = unwrap(
        await supabase
          .from("rooms")
          .update(row)
          .eq("id", values.id)
          .eq("organization_id", orgId)
          .select("id"),
      );
      if (updated.length !== 1) throw new ActionError("errors.notFound");
    } else {
      unwrap(await supabase.from("rooms").insert({ ...row, organization_id: orgId }));
    }
    revalidatePath("/", "layout");
    return null;
  });
}

export async function deleteRoom(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requirePermission("settings.catalogs");
    const supabase = await createClient();
    const { count } = await supabase
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("room_id", id);
    if (count) throw new ActionError("errors.roomInUse");
    const deleted = unwrap(
      await supabase
        .from("rooms")
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
