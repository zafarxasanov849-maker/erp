"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  type PermissionModule,
  WILDCARD,
} from "@/lib/permissions";

import { deleteRole, saveRole } from "../actions";
import { type RoleValues, roleSchema } from "../schema";

export function RoleEditor({
  role,
  grantable,
  listPath,
}: {
  role: (RoleValues & { isSystem: boolean; isOwner: boolean }) | null;
  /** Joriy foydalanuvchi bera oladigan ruxsatlar ("*" — hammasi). */
  grantable: readonly string[];
  listPath: string;
}) {
  const t = useTranslations("settings.roles");
  const tp = useTranslations("permissions");
  const tc = useTranslations("common");
  const router = useRouter();
  const readOnly = role?.isOwner ?? false;

  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: role ?? { name: "", description: "", permissions: [] },
  });
  const { error, pending, run } = useServerAction(form);
  const del = useServerAction();
  const selected = useWatch({ control: form.control, name: "permissions" });
  const selectedSet = new Set(selected);
  const initial = new Set(role?.permissions ?? []);

  // Yangi ruxsat qo'shish faqat o'zida borlarini; olib tashlash — hammasini.
  const canToggle = (p: string) =>
    !readOnly && (grantable.includes(WILDCARD) || grantable.includes(p) || initial.has(p));

  function setPermissions(next: Set<string>) {
    form.setValue("permissions", [...next].sort(), { shouldDirty: true });
  }

  function toggle(p: string, on: boolean) {
    const next = new Set(selectedSet);
    if (on) next.add(p);
    else next.delete(p);
    setPermissions(next);
  }

  function toggleMany(perms: readonly string[], on: boolean) {
    const next = new Set(selectedSet);
    for (const p of perms.filter(canToggle)) {
      if (on) next.add(p);
      else next.delete(p);
    }
    setPermissions(next);
  }

  const groups = Object.entries(PERMISSION_GROUPS) as [PermissionModule, readonly string[]][];

  return (
    <Form {...form}>
      <form
        className="grid gap-6"
        onSubmit={form.handleSubmit((v) =>
          run(
            () => saveRole({ ...v, id: role?.id }),
            () => {
              toast.success(tc("saved"));
              router.push(listPath);
            },
          ),
        )}
      >
        {readOnly && (
          <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <Lock className="size-4" />
            {t("ownerLocked")}
          </p>
        )}
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name")}</FormLabel>
                <FormControl>
                  <Input disabled={readOnly} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("roleDescription")}</FormLabel>
                <FormControl>
                  <Input disabled={readOnly} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{t("permissionsTitle")}</h2>
            {!readOnly && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleMany(ALL_PERMISSIONS, true)}
                >
                  {t("selectAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMany(ALL_PERMISSIONS, false)}
                >
                  {t("clearAll")}
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map(([module, actions]) => {
              const perms = actions.map((a) => `${module}.${a}`);
              const count = perms.filter(
                (p) => selectedSet.has(p) || selectedSet.has(WILDCARD),
              ).length;
              const groupState =
                count === perms.length ? true : count > 0 ? ("indeterminate" as const) : false;
              const groupId = `perm-group-${module}`;
              return (
                <Card key={module} className="gap-3 py-4">
                  <CardHeader className="px-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={groupId}
                        checked={groupState}
                        disabled={readOnly || !perms.some(canToggle)}
                        onCheckedChange={(v) => toggleMany(perms, v === true)}
                      />
                      <label htmlFor={groupId} className="cursor-pointer">
                        {tp(`${module}._title`)}
                      </label>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 px-4 pl-10">
                    {actions.map((action) => {
                      const p = `${module}.${action}`;
                      const id = `perm-${p}`;
                      return (
                        <div key={p} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            id={id}
                            checked={selectedSet.has(p) || selectedSet.has(WILDCARD)}
                            disabled={!canToggle(p)}
                            onCheckedChange={(v) => toggle(p, v === true)}
                          />
                          <label htmlFor={id} className="cursor-pointer">
                            {tp(`${module}.${action}` as `students.view`)}
                          </label>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <FormError error={error ?? del.error} />

        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <Button type="submit" disabled={pending}>
              {tc("save")}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={listPath}>{readOnly ? tc("back") : tc("cancel")}</Link>
          </Button>
          {role && !role.isSystem && (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-destructive"
              disabled={del.pending}
              onClick={() => {
                if (!window.confirm(t("deleteConfirm", { name: role.name }))) return;
                del.run(
                  () => deleteRole(role.id!),
                  () => {
                    toast.success(t("deleted"));
                    router.push(listPath);
                  },
                );
              }}
            >
              <Trash2 />
              {tc("delete")}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
