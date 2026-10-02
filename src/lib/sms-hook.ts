import { Webhook } from "standardwebhooks";

/**
 * Supabase Auth "Send SMS" hook so'rovi (Standard Webhooks imzosi bilan).
 * https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
 */
export interface SendSmsHookPayload {
  user: { id: string; phone: string };
  sms: { otp: string };
}

/** Sir "v1,whsec_<base64>" ko'rinishida (Supabase Dashboard / config.toml). */
export function verifySmsHook(
  secret: string,
  body: string,
  headers: Record<string, string>,
): SendSmsHookPayload {
  const base64 = secret.replace(/^v1,whsec_/, "");
  const payload = new Webhook(base64).verify(body, headers) as SendSmsHookPayload;
  if (!payload?.user?.phone || !payload?.sms?.otp) {
    throw new Error("Invalid send-sms hook payload");
  }
  return payload;
}

/** GoTrue telefonni "998901234567" ko'rinishida yuboradi. */
export function hookPhoneToE164(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}
