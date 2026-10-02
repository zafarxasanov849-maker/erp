import { expect, test } from "@playwright/test";

import { openNav, registerOrg } from "./helpers";

const NAV_UZ = [
  "Bosh sahifa",
  "Sotuv",
  "Talabalar",
  "Guruhlar",
  "Ustozlar",
  "Moliya",
  "Hisobotlar",
  "Sozlamalar",
];

test("egasi 8 bo'limni ko'radi, til almashadi, filial saqlanadi", async ({ page }) => {
  const account = await registerOrg(page);

  // Markaz nomi qobiqda
  const nav = await openNav(page);
  await expect(nav.getByText(account.orgName)).toBeVisible();
  await expect(nav.getByRole("link")).toHaveText(NAV_UZ);
  await nav.getByRole("link", { name: "Talabalar" }).click();
  await expect(page).toHaveURL(/\/students$/);
  await expect(page.getByRole("heading", { level: 1, name: "Talabalar" })).toBeVisible();

  // Filial tanlagich: "Barcha filiallar" — bo'lim saqlanadi
  await page.getByRole("button", { name: "Filialni tanlash" }).click();
  await page.getByRole("menuitem", { name: "Barcha filiallar" }).click();
  await expect(page).toHaveURL(/\/all\/students$/);

  // Til
  await page.getByRole("button", { name: "Foydalanuvchi menyusi" }).click();
  await page.getByRole("menuitem", { name: "Til" }).click();
  await page.getByRole("menuitemradio", { name: "Русский" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Студенты" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.getByRole("button", { name: "Меню пользователя" }).click();
  await page.getByRole("menuitem", { name: "Язык" }).click();
  await page.getByRole("menuitemradio", { name: "O'zbekcha" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Talabalar" })).toBeVisible();

  // Mobil kenglikda gorizontal aylantirish yo'q
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("noma'lum filial → 403", async ({ page }) => {
  await registerOrg(page);
  const res = await page.goto("/00000000-0000-4000-8000-000000000000/dashboard");
  expect(res?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Sizda bu bo'limga ruxsat yo'q" })).toBeVisible();
});
