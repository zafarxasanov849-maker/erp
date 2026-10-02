import { type Page, expect, test } from "@playwright/test";

import { branchIdFrom, registerOrg } from "./helpers";

async function pick(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function createGroup(
  page: Page,
  base: string,
  g: { name: string; days: string[]; start: string },
) {
  await page.goto(`${base}/groups/new`);
  await expect(page.getByRole("heading", { name: "Guruh ochish" })).toBeVisible();
  await page.getByLabel("Guruh nomi").fill(g.name);
  await pick(page, "Kurs", "Ingliz tili");
  await pick(page, "Xona", "6-xona");
  for (const d of g.days) await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByLabel("Boshlanishi").fill(g.start);
}

test("kurs → xona → guruh → darslar → bayram → to'qnashuv → haftalik jadval", async ({ page }) => {
  await registerOrg(page);
  const base = `/${branchIdFrom(page)}`;

  // Guruh ochishdan oldin kurs kerak — bo'sh holat tushuntiradi
  await page.goto(`${base}/groups/new`);
  await expect(page.getByText("Avval kurs qo'shing")).toBeVisible();

  // Kurs
  await page.goto(`${base}/settings/courses`);
  await page.getByRole("button", { name: "Kurs qo'shish" }).click();
  const courseDialog = page.getByRole("dialog");
  await courseDialog.getByLabel("Nomi").fill("Ingliz tili");
  await courseDialog.getByLabel("Oylik narx").fill("680000");
  await expect(courseDialog.getByLabel("Oylik narx")).toHaveValue("680 000");
  await courseDialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("row", { name: /Ingliz tili/ })).toContainText("680 000 so'm");

  // Xona
  await page.goto(`${base}/settings/rooms`);
  await page.getByRole("button", { name: "Xona qo'shish" }).click();
  await page.getByRole("dialog").getByLabel("Nomi").fill("6-xona");
  await page.getByRole("dialog").getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("row", { name: /6-xona/ })).toBeVisible();

  // Guruh: Du-Ch-Ju 14:00, tugash vaqti kursdan (90 daqiqa) avtomatik
  await createGroup(page, base, { name: "10-guruh", days: ["Du", "Ch", "Ju"], start: "14:00" });
  await expect(page.getByLabel("Tugashi")).toHaveValue("15:30");
  await expect(page.getByLabel("Oylik narx")).toHaveValue("680 000");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page).toHaveURL(/\/groups\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "10-guruh" })).toBeVisible();

  // Darslar 60 kunga yaratilgan (~25 ta)
  const scheduled = page.locator('tr[data-status="scheduled"]');
  await expect(scheduled.first()).toBeVisible();
  const before = await scheduled.count();
  expect(before).toBeGreaterThanOrEqual(24);
  const firstDate = (await scheduled.first().locator("td").first().innerText()).slice(0, 10);

  // Bayram → o'sha kundagi dars bekor qilinadi
  await page.goto(`${base}/settings/holidays`);
  await page.getByRole("button", { name: "Bayram qo'shish" }).click();
  const hDialog = page.getByRole("dialog");
  await hDialog.getByLabel("Sana").fill(firstDate);
  await hDialog.getByLabel("Sabab").fill("Test bayrami");
  await hDialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Bekor qilingan darslar: 1")).toBeVisible();

  await page.goto(`${base}/groups`);
  await page.getByRole("link", { name: "10-guruh" }).click();
  await expect(page.locator('tr[data-status="scheduled"]')).toHaveCount(before - 1);
  await expect(page.locator('tr[data-status="cancelled"]').first()).toContainText("Test bayrami");

  // To'qnashuv: shu xona, Du 15:00 da
  await createGroup(page, base, { name: "11-guruh", days: ["Du"], start: "15:00" });
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByTestId("schedule-conflicts")).toContainText(
    "6-xona Du 14:00–15:30 da 10-guruh bilan band",
  );

  // Vaqtni o'zgartirsa saqlanadi
  await page.getByLabel("Boshlanishi").fill("16:00");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "11-guruh" })).toBeVisible();

  // Ro'yxat va haftalik jadval
  await page.goto(`${base}/groups`);
  await expect(page.getByRole("row", { name: /10-guruh/ })).toContainText("Du, Ch, Ju");
  await page.goto(`${base}/groups/schedule?day=1`);
  const grid = page.getByTestId("schedule-grid");
  await expect(grid.getByText("6-xona")).toBeVisible();
  await expect(grid.getByRole("link", { name: /10-guruh/ })).toBeVisible();
  await expect(grid.getByRole("link", { name: /11-guruh/ })).toBeVisible();
});
