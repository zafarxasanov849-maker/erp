"use client";

import { Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WILDCARD } from "@/lib/permissions";

import type { RoleRow } from "../queries";

export function RolesTable({ roles, basePath }: { roles: RoleRow[]; basePath: string }) {
  const t = useTranslations("settings.roles");
  const router = useRouter();

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <Button asChild>
          <Link href={`${basePath}/new`}>
            <Plus />
            {t("add")}
          </Link>
        </Button>
      </div>
      {roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("roleDescription")}</TableHead>
                <TableHead className="text-right">{t("staffCount")}</TableHead>
                <TableHead className="text-right">{t("permissionCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`${basePath}/${r.id}`)}
                >
                  <TableCell className="font-medium">
                    <Link
                      href={`${basePath}/${r.id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.name}
                    </Link>
                    {r.is_system && (
                      <Badge variant="outline" className="ml-2">
                        {t("system")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-sm truncate text-muted-foreground md:table-cell">
                    {r.description || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.staffCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.permissions.includes(WILDCARD) ? t("allPermissions") : r.permissions.length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
