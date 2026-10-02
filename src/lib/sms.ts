import "server-only";

/**
 * SMS yuborish interfeysi. 9-bosqichda Eskiz.uz provayderi qo'shiladi;
 * hozircha development'da SMS konsolga chiqadi va dev "inbox"ga yoziladi.
 */
export interface SmsSender {
  send(phone: string, text: string): Promise<void>;
}

interface DevMessage {
  phone: string;
  text: string;
  at: number;
}

// next dev/start bitta Node jarayonida ishlaydi — globalThis modul qayta yuklansa ham saqlanadi.
const g = globalThis as unknown as { __devSmsInbox?: Map<string, DevMessage> };
const inbox = (g.__devSmsInbox ??= new Map<string, DevMessage>());

/** Dev inbox faqat aniq yoqilganda ishlaydi (lokal va e2e). Production'da hech qachon yoqmang. */
export function isDevSmsInboxEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEV_SMS_INBOX === "1";
}

const consoleSender: SmsSender = {
  async send(phone, text) {
    console.info(`[sms:dev] ${phone}: ${text}`);
    if (isDevSmsInboxEnabled()) inbox.set(phone, { phone, text, at: Date.now() });
  },
};

export function getSmsSender(): SmsSender {
  // TODO(9-bosqich): ESKIZ_EMAIL/ESKIZ_PASSWORD bo'lsa Eskiz provayderi.
  if (process.env.NODE_ENV === "production" && !isDevSmsInboxEnabled()) {
    throw new Error("SMS provayderi sozlanmagan (Eskiz 9-bosqichda ulanadi).");
  }
  return consoleSender;
}

export function readDevSms(phone: string): DevMessage | null {
  if (!isDevSmsInboxEnabled()) return null;
  return inbox.get(phone) ?? null;
}
