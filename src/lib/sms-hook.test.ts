import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";

import { hookPhoneToE164, verifySmsHook } from "./sms-hook";

const base64 = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
const secret = `v1,whsec_${base64}`;

function sign(body: string, key = base64) {
  const id = "msg_1";
  const timestamp = new Date();
  const signature = new Webhook(key).sign(id, timestamp, body);
  return {
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": signature,
  };
}

describe("verifySmsHook", () => {
  const body = JSON.stringify({
    user: { id: "u1", phone: "998901234567" },
    sms: { otp: "123456" },
  });

  it("to'g'ri imzoni qabul qiladi", () => {
    const payload = verifySmsHook(secret, body, sign(body));
    expect(payload.sms.otp).toBe("123456");
    expect(payload.user.phone).toBe("998901234567");
  });

  it("boshqa kalit bilan imzolangan so'rovni rad etadi", () => {
    const other = Buffer.from("ffffffffffffffffffffffffffffffff").toString("base64");
    expect(() => verifySmsHook(secret, body, sign(body, other))).toThrow();
  });

  it("o'zgartirilgan tanani rad etadi", () => {
    const headers = sign(body);
    expect(() => verifySmsHook(secret, body.replace("123456", "000000"), headers)).toThrow();
  });

  it("noto'g'ri tuzilishni rad etadi", () => {
    const bad = JSON.stringify({ user: {} });
    expect(() => verifySmsHook(secret, bad, sign(bad))).toThrow();
  });
});

describe("hookPhoneToE164", () => {
  it("+ qo'shadi", () => {
    expect(hookPhoneToE164("998901234567")).toBe("+998901234567");
    expect(hookPhoneToE164("+998901234567")).toBe("+998901234567");
  });
});
