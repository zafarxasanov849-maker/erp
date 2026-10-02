import { NextResponse, type NextRequest } from "next/server";

import { isDevSmsInboxEnabled, readDevSms } from "@/lib/sms";

// Faqat lokal/e2e: oxirgi SMS'ni ko'rish. Production'da 404.
export async function GET(request: NextRequest) {
  if (!isDevSmsInboxEnabled()) return new NextResponse(null, { status: 404 });
  const phone = request.nextUrl.searchParams.get("phone") ?? "";
  const message = readDevSms(phone);
  if (!message) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const code = /\b(\d{6})\b/.exec(message.text)?.[1] ?? null;
  return NextResponse.json({ ...message, code });
}
