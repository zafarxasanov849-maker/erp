import { type APIRequestContext, type Page, expect } from "@playwright/test";

/** Har test uchun noyob raqam: +998 77 XXX XX XX */
export function randomPhone(): { local: string; e164: string } {
  const n = String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0");
  const local = `77 ${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)}`;
  return { local, e164: `+99877${n}` };
}

/** Dev SMS inbox'dan (DEV_SMS_INBOX) oxirgi kodni o'qish. */
export async function readSmsCode(request: APIRequestContext, e164: string): Promise<string> {
  let code: string | null = null;
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/dev/sms?phone=${encodeURIComponent(e164)}`);
        if (!res.ok()) return null;
        const body = (await res.json()) as { code: string | null; at: number };
        code = body.code;
        return code;
      },
      { timeout: 10_000 },
    )
    .not.toBeNull();
  return code!;
}

export interface Account {
  phone: { local: string; e164: string };
  password: string;
  orgName: string;
  fullName: string;
}

/** Ro'yxatdan o'tish → SMS kod → markaz ochish → bosh sahifa. */
export async function registerOrg(page: Page, overrides: Partial<Account> = {}): Promise<Account> {
  const account: Account = {
    phone: randomPhone(),
    password: "parol12345",
    orgName: `Test markaz ${Date.now()}`,
    fullName: "Aziz Egasi",
    ...overrides,
  };
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Markaz ochish" })).toBeVisible();
  await page.getByLabel("Markaz nomi").fill(account.orgName);
  await page.getByLabel("Ism va familiya").fill(account.fullName);
  await page.getByLabel("Telefon raqami").fill(account.phone.local);
  await page.getByLabel("Parol", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Davom etish" }).click();

  await expect(page).toHaveURL(/\/verify\?purpose=signup/);
  const code = await readSmsCode(page.request, account.phone.e164);
  await page.getByLabel("SMS kod").fill(code);
  await page.getByRole("button", { name: "Tasdiqlash" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByLabel("Markaz nomi")).toHaveValue(account.orgName);
  await page.getByLabel("Birinchi filial nomi").fill("Chilonzor");
  await page.getByRole("button", { name: "Markazni ochish" }).click();

  await expect(page).toHaveURL(/\/[0-9a-f-]{36}\/dashboard$/);
  return account;
}

export async function login(page: Page, phoneLocal: string, password: string) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Kirish" })).toBeVisible();
  await page.getByLabel("Telefon raqami").fill(phoneLocal);
  await page.getByLabel("Parol", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Kirish", exact: true }).click();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Foydalanuvchi menyusi" }).click();
  await page.getByRole("menuitem", { name: "Chiqish" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** Desktop'da sidebar, mobilda drawer ichidagi navigatsiya. */
export async function openNav(page: Page) {
  const sidebar = page.getByTestId("sidebar");
  if (await sidebar.isVisible()) return sidebar;
  await page.getByRole("button", { name: /Menyuni ochish|Открыть меню/ }).click();
  return page.getByRole("dialog");
}

/** Joriy URL'dagi filial id. */
export function branchIdFrom(page: Page): string {
  return new URL(page.url()).pathname.split("/")[1]!;
}
