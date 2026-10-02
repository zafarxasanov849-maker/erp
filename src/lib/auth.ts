import "server-only";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";

import { ForbiddenError } from "./action";
import { hasPermission, type Permission } from "./permissions";
import { createClient } from "./supabase/server";

/** Tanlangan markaz (foydalanuvchi bir nechta markazda ishlashi mumkin). */
export const ORG_COOKIE = "org_id";

export const ORG_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
};

export interface Profile {
  id: string;
  fullName: string;
  phone: string | null;
  mustChangePassword: boolean;
}

export interface Membership {
  staffId: string;
  orgId: string;
  orgName: string;
  orgColor: string | null;
  orgLogo: string | null;
  roleId: string;
  roleName: string;
  roleKey: string | null;
  permissions: string[];
  allBranches: boolean;
  isTeacher: boolean;
}

export interface BranchRef {
  id: string;
  name: string;
}

export interface OrgContext {
  user: User;
  profile: Profile;
  membership: Membership;
  memberships: Membership[];
  /** Foydalanuvchi ko'ra oladigan faol filiallar (filial tanlagich uchun). */
  branches: BranchRef[];
}

export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, must_change_password")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    phone: data.phone,
    mustChangePassword: data.must_change_password,
  };
});

export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getAuthUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select(
      `id, organization_id, all_branches, is_teacher,
       role:roles!staff_role_id_fkey ( id, name, system_key, permissions ),
       organization:organizations ( id, name, primary_color, logo_url )`,
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at");
  if (error) throw error;

  return (data ?? []).flatMap((s) =>
    s.role && s.organization
      ? [
          {
            staffId: s.id,
            orgId: s.organization_id,
            orgName: s.organization.name,
            orgColor: s.organization.primary_color,
            orgLogo: s.organization.logo_url,
            roleId: s.role.id,
            roleName: s.role.name,
            roleKey: s.role.system_key,
            permissions: s.role.permissions,
            allBranches: s.all_branches,
            isTeacher: s.is_teacher,
          },
        ]
      : [],
  );
});

async function getAccessibleBranches(m: Membership): Promise<BranchRef[]> {
  const supabase = await createClient();
  if (m.allBranches) {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name")
      .eq("organization_id", m.orgId)
      .eq("is_active", true)
      .order("created_at");
    if (error) throw error;
    return data ?? [];
  }
  const { data, error } = await supabase
    .from("staff_branches")
    .select("branch:branches ( id, name, is_active, created_at )")
    .eq("staff_id", m.staffId);
  if (error) throw error;
  return (data ?? [])
    .flatMap((r) => (r.branch && r.branch.is_active ? [r.branch] : []))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(({ id, name }) => ({ id, name }));
}

/**
 * Ichki sahifalar uchun kontekst. Kirmagan → /login, parolni almashtirish kerak →
 * /change-password, markazi yo'q → /onboarding, markaz tanlanmagan → /select-org.
 */
export const getOrgContext = cache(async (): Promise<OrgContext> => {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.mustChangePassword) redirect("/change-password");

  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/onboarding");

  const selected = (await cookies()).get(ORG_COOKIE)?.value;
  const membership =
    memberships.find((m) => m.orgId === selected) ??
    (memberships.length === 1 ? memberships[0] : undefined);
  if (!membership) redirect("/select-org");

  const branches = await getAccessibleBranches(membership);
  return { user, profile, membership, memberships, branches };
});

export function can(ctx: OrgContext, perm: Permission): boolean {
  return hasPermission(ctx.membership.permissions, perm);
}

export function canAny(ctx: OrgContext, perms: readonly Permission[]): boolean {
  return perms.some((p) => can(ctx, p));
}

/** Server Action'lar uchun: ruxsat bo'lmasa ForbiddenError (runAction → "errors.forbidden"). */
export async function requirePermission(perm: Permission): Promise<OrgContext> {
  const ctx = await getOrgContext();
  if (!can(ctx, perm)) throw new ForbiddenError(perm);
  return ctx;
}

/** Sahifalar uchun: ruxsat bo'lmasa 403 sahifa (src/app/forbidden.tsx). */
export async function requirePagePermission(
  perm: Permission | readonly Permission[],
): Promise<OrgContext> {
  const ctx = await getOrgContext();
  const perms = typeof perm === "string" ? [perm] : perm;
  if (!canAny(ctx, perms)) forbidden();
  return ctx;
}
