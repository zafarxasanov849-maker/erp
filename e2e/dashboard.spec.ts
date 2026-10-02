import { expect, test } from "@playwright/test";

import { formatMoney } from "../src/lib/money";

import { seedMetricsScenario, seedStaff } from "./db";
import { branchIdFrom, login, logout, randomPhone, registerOrg } from "./helpers";

const SHOTS = process.env.E2E_SHOTS;

test("bosh sahifa (Egasi): kartochkalar to'g'ri, filial bo'yicha o'zgaradi", async ({
  page,
}, info) => {
  await registerOrg(page);
  const b1 = branchIdFrom(page);
  const { b2 } = await seedMetricsScenario(b1);

  // Barcha filiallar
  await page.goto("/all/dashboard");
  await expect(page.getByTestId("card-revenue-value")).toHaveText(formatMoney(750_000));
  await expect(page.getByTestId("card-revenue")).toContainText("3 talaba to'lagan");
  await expect(page.getByTestId("card-debt-value")).toHaveText(formatMoney(750_000));
  await expect(page.getByTestId("card-debt")).toContainText("2 qarzdor talaba");
  await expect(page.getByTestId("card-active-value")).toHaveText("3");
  await expect(page.getByTestId("card-active")).toContainText("Sinovda 1, muzlatilgan 0");
  await expect(page.getByTestId("card-left-value")).toHaveText("1");
  await expect(page.getByTestId("card-profit-value")).toHaveText("—");
  await expect(
    page.getByRole("heading", { name: "Filiallar bo'yicha tushum (shu oy)" }),
  ).toBeVisible();
  if (SHOTS) {
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SHOTS}/dashboard-leader-${info.project.name}.png`,
      fullPage: true,
    });
  }

  // Faqat Sergeli
  await page.goto(`/${b2}/dashboard`);
  await expect(page.getByTestId("card-revenue-value")).toHaveText(formatMoney(100_000));
  await expect(page.getByTestId("card-debt-value")).toHaveText(formatMoney(400_000));
  await expect(page.getByTestId("card-active-value")).toHaveText("1");
  await expect(
    page.getByRole("heading", { name: "Filiallar bo'yicha tushum (shu oy)" }),
  ).toBeHidden();
});

test("hisobotlar: raqamlar bosh sahifa bilan bir xil, Excel, Tushumlar", async ({ page }, info) => {
  await registerOrg(page);
  const b1 = branchIdFrom(page);
  await seedMetricsScenario(b1);

  await page.goto("/all/dashboard");
  const revenue = await page.getByTestId("card-revenue-value").textContent();
  expect(revenue).toBe(formatMoney(750_000));

  // Moliya: shu oy jami = bosh sahifadagi tushum
  await page.goto("/all/reports");
  await expect(page).toHaveURL(/\/all\/reports\/finance$/);
  await expect(page.getByTestId("report-revenue-value")).toHaveText(revenue!);
  await expect(page.getByTestId("finance-total")).toHaveText(revenue!);
  await expect(page.getByTestId("report-payers-value")).toHaveText("3");
  if (SHOTS) {
    await page.screenshot({
      path: `${SHOTS}/report-finance-${info.project.name}.png`,
      fullPage: true,
    });
  }

  // Excel (desktop): fayl yuklanadi
  if (info.project.name === "desktop") {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Excel'ga yuklash" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^moliya-.*\.xlsx$/);
  }

  // Davr: oxirgi 3 oy — kechagi dars doim kiradi (oyning 1-kuni ham)
  await page.goto("/all/reports/attendance?period=quarter");
  await expect(page.getByTestId("report-marked-value")).toHaveText("50%");
  await expect(page.getByTestId("report-attended-value")).toHaveText("50%");
  await expect(page.getByTestId("report-absent-value")).toHaveText("1");
  await expect(page.getByTestId("attendance-groups").locator('[data-group="G1"]')).toBeVisible();
  if (SHOTS) {
    await page.screenshot({
      path: `${SHOTS}/report-attendance-${info.project.name}.png`,
      fullPage: true,
    });
  }

  // Talabalar oqimi: ketgan = bosh sahifadagi "Ketganlar"
  await page.goto("/all/reports/students");
  await expect(page.getByTestId("report-left-value")).toHaveText("1");
  await expect(page.getByTestId("left-list")).toContainText("L1");
  await expect(page.getByTestId("report-active-end-value")).toHaveText("3");
  if (SHOTS) {
    await page.screenshot({
      path: `${SHOTS}/report-students-${info.project.name}.png`,
      fullPage: true,
    });
  }

  // Davrni tanlash: o'tgan oyda to'lov yo'q
  await page.goto("/all/reports/finance");
  await page.getByRole("combobox", { name: "Davr" }).click();
  await page.getByRole("option", { name: "O'tgan oy" }).click();
  await expect(page).toHaveURL(/period=last_month/);
  await expect(page.getByText("Bu davrda to'lov yo'q")).toBeVisible();

  // Qarzdorlar: jami = bosh sahifadagi qarzdorlik
  await page.goto("/all/finance");
  await expect(page.getByTestId("debtors-total")).toContainText(formatMoney(750_000));
  await expect(page.getByTestId("debtors").getByRole("row")).toHaveCount(3);

  // Moliya → Tushumlar: jami = tushum; turi bo'yicha filtr
  await page.goto("/all/finance/payments");
  await expect(page.getByTestId("payments-total")).toHaveText(revenue!);
  await expect(page.getByTestId("payments-list").getByRole("row")).toHaveCount(4);
  await page.getByRole("combobox", { name: "To'lov turi" }).click();
  await page.getByRole("option", { name: "Terminal" }).click();
  await expect(page.getByText("Bu davrda to'lov yo'q")).toBeVisible();
  if (SHOTS) {
    await page.goto("/all/finance/payments");
    await expect(page.getByTestId("payments-list")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/payments-${info.project.name}.png`, fullPage: true });
  }
});

test("bosh sahifa: Admin va Ustoz o'z ko'rsatkichlarini ko'radi", async ({ page }, info) => {
  await registerOrg(page);
  const b1 = branchIdFrom(page);
  const { org } = await seedMetricsScenario(b1);
  const admin = randomPhone();
  const teacher = randomPhone();
  await seedStaff({
    org,
    branchId: b1,
    role: "admin",
    fullName: "Malika Admin",
    phone: admin,
    password: "adminparol1",
  });
  await seedStaff({
    org,
    branchId: b1,
    role: "teacher",
    fullName: "Dilnoza Ustoz",
    phone: teacher,
    password: "ustozparol1",
    teachGroup: "G1",
  });

  // Admin: faqat Chilonzor — bugungi to'lovlar 650 000, 1 qarzdor, 1 sinovda, 1 dars belgilanmagan
  await logout(page);
  await login(page, admin.local, "adminparol1");
  await expect(page).toHaveURL(new RegExp(`/${b1}/dashboard$`));
  await expect(page.locator("[data-dashboard]")).toHaveAttribute("data-dashboard", "admin");
  await expect(page.getByTestId("card-paid-today-value")).toHaveText(formatMoney(650_000));
  await expect(page.getByTestId("card-debtors-value")).toHaveText("1");
  await expect(page.getByTestId("card-trial-value")).toHaveText("1");
  await expect(page.getByTestId("card-lessons-value")).toHaveText("1");
  await expect(page.getByTestId("card-lessons")).toContainText("1 tasi belgilanmagan");
  await expect(page.getByTestId("dashboard-lessons")).toContainText("G1");
  if (SHOTS) {
    await page.screenshot({
      path: `${SHOTS}/dashboard-admin-${info.project.name}.png`,
      fullPage: true,
    });
  }

  // Ustoz: o'z guruhi, talabalari (bugun: A1, A2, T1), bugungi va belgilanmagan darsi
  await logout(page);
  await login(page, teacher.local, "ustozparol1");
  await expect(page.locator("[data-dashboard]")).toHaveAttribute("data-dashboard", "teacher");
  await expect(page.getByTestId("card-my-groups-value")).toHaveText("1");
  await expect(page.getByTestId("card-my-students-value")).toHaveText("3");
  await expect(page.getByTestId("card-my-lessons-value")).toHaveText("1");
  await expect(page.getByTestId("card-my-unmarked-value")).toHaveText("1");
  await expect(page.getByTestId("dashboard-lessons")).toContainText("G1");
  if (SHOTS) {
    await page.screenshot({
      path: `${SHOTS}/dashboard-teacher-${info.project.name}.png`,
      fullPage: true,
    });
  }
});
