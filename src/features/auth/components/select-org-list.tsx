"use client";

import { Building2, ChevronRight } from "lucide-react";

import { FormError } from "@/components/form-error";
import { useServerAction } from "@/hooks/use-server-action";

import { selectOrganization } from "../actions";

export function SelectOrgList({
  items,
}: {
  items: { orgId: string; orgName: string; roleName: string }[];
}) {
  const { error, pending, run } = useServerAction();
  return (
    <div className="grid gap-2">
      {items.map((m) => (
        <button
          key={m.orgId}
          type="button"
          disabled={pending}
          onClick={() => run(() => selectOrganization(m.orgId))}
          className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="size-4" />
          </span>
          <span className="flex-1">
            <span className="block font-medium">{m.orgName}</span>
            <span className="block text-xs text-muted-foreground">{m.roleName}</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      ))}
      <FormError error={error} />
    </div>
  );
}
