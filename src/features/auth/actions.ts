"use server";

import type { AuthError } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ActionError, type ActionResult, parseInput, runAction, unwrap } from "@/lib/action";
import { ORG_COOKIE, ORG_COOKIE_OPTIONS, getAuthUser, getMemberships } from "@/lib/auth";
import { SYSTEM_ROLE_KEYS, SYSTEM_ROLE_PERMISSIONS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { toE164 } from "@/lib/validation";

import {
  type LoginValues,
  type NewPasswordValues,
  type OnboardingValues,
  type OtpPurpose,
  type RegisterValues,
  type ResetRequestValues,
  type VerifyValues,
  loginSchema,
  newPasswordSchema,
  onboardingSchema,
  otpPurposeSchema,
  registerSchema,
  resetRequestSchema,
  verifySchema,
} from "./schema";

/** Supabase Auth xato kodlari → messages kalitlari. */
function authError(error: AuthError): ActionError {
  switch (error.code) {
    case "invalid_credentials":
      return new ActionError("errors.auth.invalidCredentials");
    case "phone_exists":
    case "user_already_exists":
      return new ActionError("errors.auth.phoneExists");
    case "otp_expired":
      return new ActionError("errors.auth.invalidCode");
    case "over_sms_send_rate_limit":
    case "over_request_rate_limit":
      return new ActionError("errors.auth.rateLimit");
    case "weak_password":
      return new ActionError("validation.passwordMin");
    case "same_password":
      return new ActionError("errors.auth.samePassword");
    case "otp_disabled":
    case "user_not_found":
      return new ActionError("errors.auth.phoneNotRegistered");
    case "sms_send_failed":
    case "hook_timeout":
    case "unexpected_failure":
      console.error("[auth]", error);
      return new ActionError("errors.auth.smsFailed");
    default:
      console.error("[auth]", error);
      return new ActionError("errors.unexpected");
  }
}

function verifyUrl(phone: string, purpose: OtpPurpose) {
  return `/verify?purpose=${purpose}&phone=${encodeURIComponent(phone)}`;
}

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(input: LoginValues, next?: string): Promise<ActionResult> {
  return runAction(async () => {
    const values = parseInput(loginSchema, input);
    const phone = toE164(values.phone);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ phone, password: values.password });
    if (error?.code === "phone_not_confirmed") {
      await supabase.auth.resend({ type: "sms", phone });
      redirect(verifyUrl(phone, "signup"));
    }
    if (error) throw authError(error);
    redirect(safeNext(next));
  });
}

export async function signUp(input: RegisterValues): Promise<ActionResult> {
  return runAction(async () => {
    const values = parseInput(registerSchema, input);
    const phone = toE164(values.phone);
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      phone,
      password: values.password,
      options: { data: { full_name: values.fullName, org_name: values.orgName } },
    });
    if (error) throw authError(error);
    // Tasdiqlangan raqam bilan qayta ro'yxatdan o'tishda GoTrue identities bo'sh qaytaradi.
    if (data.user && data.user.identities?.length === 0) {
      throw new ActionError("errors.auth.phoneExists");
    }
    redirect(verifyUrl(phone, "signup"));
  });
}

export async function verifyCode(input: VerifyValues): Promise<ActionResult> {
  return runAction(async () => {
    const values = parseInput(verifySchema, input);
    const phone = toE164(values.phone);
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ phone, token: values.code, type: "sms" });
    if (error) throw authError(error);
    redirect(values.purpose === "signup" ? "/onboarding" : "/change-password");
  });
}

export async function resendCode(
  phoneInput: string,
  purposeInput: OtpPurpose,
): Promise<ActionResult> {
  return runAction(async () => {
    const { phone: local } = parseInput(resetRequestSchema, { phone: phoneInput });
    const purpose = parseInput(otpPurposeSchema, purposeInput);
    const phone = toE164(local);
    const supabase = await createClient();
    const { error } =
      purpose === "signup"
        ? await supabase.auth.resend({ type: "sms", phone })
        : await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
    if (error) throw authError(error);
    return null;
  });
}

export async function requestPasswordReset(input: ResetRequestValues): Promise<ActionResult> {
  return runAction(async () => {
    const values = parseInput(resetRequestSchema, input);
    const phone = toE164(values.phone);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });
    if (error) throw authError(error);
    redirect(verifyUrl(phone, "reset"));
  });
}

export async function changePassword(input: NewPasswordValues): Promise<ActionResult> {
  return runAction(async () => {
    const values = parseInput(newPasswordSchema, input);
    const user = await getAuthUser();
    if (!user) redirect("/login");
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) throw authError(error);
    unwrap(
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id),
    );
    redirect("/");
  });
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ORG_COOKIE);
  redirect("/login");
}

export async function createOrganization(input: OnboardingValues): Promise<ActionResult> {
  return runAction(async () => {
    const values = parseInput(onboardingSchema, input);
    const user = await getAuthUser();
    if (!user) redirect("/login");

    // Tizim rollari: ruxsatlar — lib/permissions.ts, nomlar — o'zbekcha (markaz ma'lumoti).
    const t = await getTranslations({ locale: "uz", namespace: "roles.system" });
    const roles = SYSTEM_ROLE_KEYS.map((key) => ({
      key,
      name: t(`${key}.name`),
      description: t(`${key}.description`),
      permissions: [...SYSTEM_ROLE_PERMISSIONS[key]],
    }));

    const supabase = await createClient();
    const orgId = unwrap(
      await supabase.rpc("register_organization", {
        p_org_name: values.orgName,
        p_owner_name: values.fullName,
        p_branch_name: values.branchName,
        p_roles: roles,
      }),
    );

    (await cookies()).set(ORG_COOKIE, orgId, ORG_COOKIE_OPTIONS);
    redirect("/");
  });
}

export async function selectOrganization(orgId: string): Promise<ActionResult> {
  return runAction(async () => {
    const memberships = await getMemberships();
    if (!memberships.some((m) => m.orgId === orgId)) throw new ActionError("errors.forbidden");
    (await cookies()).set(ORG_COOKIE, orgId, ORG_COOKIE_OPTIONS);
    redirect("/");
  });
}
