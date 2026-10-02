import { expect, test, type Page } from "@playwright/test";

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

/** Desktop'da sidebar, mobilda drawer ichidagi navigatsiya. */
async function openNav(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole("button", { name: /Menyuni ochish|Открыть меню/ }).click();
    return page.getByRole("dialog");
  }
  return page.getByTestId("sidebar");
}

test("bosh sahifaga yo'naltiradi va 8 bo'limni ko'rsatadi", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile";
  await page.goto("/");
  await expect(page).toHaveURL(/\/[0-9a-f-]{36}\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: "Bosh sahifa" })).toBeVisible();

  const nav = await openNav(page, isMobile);
  const links = nav.getByRole("link");
  await expect(links).toHaveText(NAV_UZ);
  await expect(nav.getByText(/^More$/)).toHaveCount(0);
});

test("sidebar orqali bo'limga o'tish", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile";
  await page.goto("/");
  const nav = await openNav(page, isMobile);
  await nav.getByRole("link", { name: "Talabalar" }).click();

  await expect(page).toHaveURL(/\/students$/);
  await expect(page.getByRole("heading", { level: 1, name: "Talabalar" })).toBeVisible();
  if (isMobile) await expect(page.getByRole("dialog")).toBeHidden();
});

test("tilni ruschaga va qaytib o'zbekchaga almashtirish", async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === "mobile";
  await page.goto("/");

  await page.getByRole("button", { name: "Foydalanuvchi menyusi" }).click();
  await page.getByRole("menuitem", { name: "Til" }).click();
  await page.getByRole("menuitemradio", { name: "Русский" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Главная" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");

  const nav = await openNav(page, isMobile);
  await expect(nav.getByRole("link", { name: "Студенты" })).toBeVisible();
  if (isMobile) await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Меню пользователя" }).click();
  await page.getByRole("menuitem", { name: "Язык" }).click();
  await page.getByRole("menuitemradio", { name: "O'zbekcha" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bosh sahifa" })).toBeVisible();
});

test("filial almashtirilganda bo'lim saqlanadi", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByTestId("sidebar");
  if (await nav.isVisible()) {
    await nav.getByRole("link", { name: "Guruhlar" }).click();
  } else {
    await page.goto(page.url().replace(/dashboard$/, "groups"));
  }
  await expect(page).toHaveURL(/\/groups$/);

  await page.getByRole("button", { name: "Filialni tanlash" }).click();
  await page.getByRole("menuitem", { name: "Barcha filiallar" }).click();
  await expect(page).toHaveURL(/\/all\/groups$/);
  await expect(page.getByRole("button", { name: "Filialni tanlash" })).toContainText(
    "Barcha filiallar",
  );
});

test("noma'lum filial → 404", async ({ page }) => {
  const res = await page.goto("/not-a-branch/dashboard");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Sahifa topilmadi" })).toBeVisible();
});

test("mobil kenglikda gorizontal aylantirish yo'q", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
