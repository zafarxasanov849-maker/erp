import { expect, test } from "@playwright/test";

import { login, logout, randomPhone, readSmsCode, registerOrg } from "./helpers";

test("kirmagan foydalanuvchi /login ga yo'naltiriladi", async ({ page }) => {
  await page.goto("/students");
  await expect(page).toHaveURL(/\/login\?next=%2Fstudents$/);
  await expect(page.getByRole("heading", { name: "Kirish" })).toBeVisible();
});

test("markaz ochish → chiqish → qayta kirish", async ({ page }) => {
  const account = await registerOrg(page);
  await expect(page.getByRole("heading", { level: 1, name: "Salom, Aziz!" })).toBeVisible();

  await logout(page);

  await login(page, account.phone.local, "noto'g'ri-parol");
  await expect(page.getByTestId("form-error")).toHaveText("Telefon raqami yoki parol noto'g'ri");

  await login(page, account.phone.local, account.password);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("ro'yxatdan o'tgan raqam bilan qayta ro'yxatdan o'tib bo'lmaydi", async ({ page }) => {
  const account = await registerOrg(page);
  await logout(page);

  await page.goto("/register");
  await page.getByLabel("Markaz nomi").fill("Ikkinchi");
  await page.getByLabel("Ism va familiya").fill("Kimdir");
  await page.getByLabel("Telefon raqami").fill(account.phone.local);
  await page.getByLabel("Parol", { exact: true }).fill("boshqaparol1");
  await page.getByRole("button", { name: "Davom etish" }).click();
  await expect(page.getByTestId("form-error")).toContainText("allaqachon ro'yxatdan o'tgan");
});

test("parolni SMS kod bilan tiklash", async ({ page }) => {
  const account = await registerOrg(page);
  await logout(page);

  await page.getByRole("link", { name: "Parolni unutdingizmi?" }).click();
  await expect(page.getByRole("heading", { name: "Parolni tiklash" })).toBeVisible();
  await page.getByLabel("Telefon raqami").fill(account.phone.local);
  // Supabase bitta raqamga 5 soniyada bir martadan ko'p SMS yubormaydi (ro'yxatdan o'tish kodi hozirgina ketdi)
  await expect(async () => {
    await page.getByRole("button", { name: "Kod yuborish" }).click();
    await expect(page).toHaveURL(/\/verify\?purpose=reset/, { timeout: 2_000 });
  }).toPass({ intervals: [3_000], timeout: 20_000 });

  const code = await readSmsCode(page.request, account.phone.e164);
  await page.getByLabel("SMS kod").fill(code);
  await page.getByRole("button", { name: "Tasdiqlash" }).click();

  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel("Yangi parol").fill("yangiparol99");
  await page.getByLabel("Parolni takrorlang").fill("yangiparol99");
  await page.getByRole("button", { name: "Parolni saqlash" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await logout(page);
  await login(page, account.phone.local, "yangiparol99");
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("noto'g'ri SMS kod", async ({ page }) => {
  const phone = randomPhone();
  await page.goto("/register");
  await page.getByLabel("Markaz nomi").fill("Kod testi");
  await page.getByLabel("Ism va familiya").fill("Test");
  await page.getByLabel("Telefon raqami").fill(phone.local);
  await page.getByLabel("Parol", { exact: true }).fill("parol12345");
  await page.getByRole("button", { name: "Davom etish" }).click();
  await expect(page).toHaveURL(/\/verify/);
  const code = await readSmsCode(page.request, phone.e164);
  const wrong = code === "000000" ? "111111" : "000000";
  await page.getByLabel("SMS kod").fill(wrong);
  await page.getByRole("button", { name: "Tasdiqlash" }).click();
  await expect(page.getByTestId("form-error")).toHaveText("Kod noto'g'ri yoki muddati o'tgan");
});
