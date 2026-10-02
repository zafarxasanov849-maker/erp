import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";

import { getSmsSender } from "@/lib/sms";
import { hookPhoneToE164, verifySmsHook } from "@/lib/sms-hook";

// Supabase Auth bu manzilni OTP yuborish uchun chaqiradi (config.toml → [auth.hook.send_sms]).
export async function POST(request: NextRequest) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) {
    return hookError(500, "SEND_SMS_HOOK_SECRET is not configured");
  }

  const body = await request.text();
  let payload;
  try {
    payload = verifySmsHook(secret, body, Object.fromEntries(request.headers));
  } catch {
    return hookError(401, "Invalid signature");
  }

  try {
    const t = await getTranslations({ locale: "uz", namespace: "sms" });
    await getSmsSender().send(
      hookPhoneToE164(payload.user.phone),
      t("otp", { code: payload.sms.otp }),
    );
  } catch (error) {
    console.error("[sms-hook]", error);
    return hookError(500, "Failed to send SMS");
  }

  return NextResponse.json({});
}

function hookError(status: number, message: string) {
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}
