import { type Page, expect, test } from "@playwright/test";

import { formatMoney } from "../src/lib/money";

import { seedMetricsScenario, seedStaff } from "./db";
import { branchIdFrom, login, logout, openNav, randomPhone, registerOrg } from "./helpers";

const SHOTS = process.env.E2E_SHOTS;

async function pick(
  page: Page,
  scope: ReturnType<Page["getByTestId"]>,
  label: string,
  option: string,
) {
  await scope.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function shot(page: Page, name: string, project: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${project}.png`, fullPage: true });
}

/** Talaba profilidan guruhga bog'langan to'lov (UI orqali) */
async function pay(page: Page, base: string, student: string, amount: number) {
  await page.goto(`${base}/students`);
  await page.getByRole("link", { name: student, exact: true }).first().click();
  await page.getByRole("button", { name: "To'lov qabul qilish" }).click();
  const dialog = page.getByTestId("payment-dialog");
  await dialog.getByLabel("Summa").fill(String(amount));
  await pick(page, dialog, "Qaysi guruh uchun", "G1");
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText(/To'lov qabul qilindi · chek №/)).toBeVisible();
}

test("ish haqi: 30% tushumdan avtomatik (ROADMAP mezoni), pul berish → xarajat, ustoz o'z oyligini ko'radi", async ({
  page,
}, info) => {
  await registerOrg(page);
  const b1 = branchIdFrom(page);
  const base = `/${b1}`;
  const { org } = await seedMetricsScenario(b1);
  const teacher = randomPhone();
  await seedStaff({
    org,
    branchId: b1,
    role: "teacher",
    fullName: "Dilnoza Ustoz",
    phone: teacher,
    password: "ustozparol1",
    teachGroup: "G1",
  });

  // Shu oy G1 guruhiga to'lovlar (urug'dagi guruhga bog'lanmagan to'lovlar asosga kirmaydi — H)
  await pay(page, base, "A2", 600_000);
  await pay(page, base, "A1", 400_000);

  // Ustozga 30% kelishuv
  await page.goto(`${base}/finance/salary`);
  await expect(page.getByText("Bu oyda hisoblanadigan oylik yo'q")).toBeVisible();
  await page.getByRole("combobox", { name: "Xodim sahifasini ochish…" }).click();
  await page.getByRole("option", { name: "Dilnoza Ustoz" }).click();
  await expect(page.getByTestId("salary-staff-name")).toHaveText("Dilnoza Ustoz");
  await page.getByRole("button", { name: "Kelishuv qo'shish" }).click();
  const ruleDialog = page.getByTestId("salary-rule-dialog");
  await ruleDialog.getByLabel("Foiz").fill("30");
  await ruleDialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(ruleDialog).toBeHidden();

  // 1 000 000 × 30% = 300 000 — avtomatik
  await expect(page.getByTestId("salary-accrued")).toHaveText(formatMoney(300_000));
  await expect(page.getByTestId("salary-lines")).toContainText("G1");
  await expect(page.getByTestId("salary-due")).toHaveText(formatMoney(300_000));
  await shot(page, "salary-staff", info.project.name);

  // Oylik berish: summa — qoldiq; xarajat avtomatik
  await page.getByRole("button", { name: "Pul berish" }).click();
  const entry = page.getByTestId("salary-entry-dialog");
  await expect(entry.getByLabel("Summa")).toHaveValue(formatMoney(300_000, { currency: false }));
  await entry.getByRole("button", { name: "Saqlash" }).click();
  await expect(entry).toBeHidden();
  await expect(page.getByTestId("salary-paid")).toHaveText(formatMoney(300_000));
  await expect(page.getByTestId("salary-due")).toHaveText(formatMoney(0));

  // Ish haqi ro'yxati
  await page.goto(`${base}/finance/salary`);
  const row = page.getByTestId("payroll").locator('[data-staff="Dilnoza Ustoz"]');
  await expect(row.getByTestId("payroll-accrued")).toContainText(formatMoney(300_000));
  await expect(row.getByTestId("payroll-due")).toHaveText(formatMoney(0));

  // Xarajatlar: "Ish haqi" yozuvi
  await page.goto(`${base}/finance/expenses`);
  await expect(page.getByTestId("expenses-total")).toHaveText(formatMoney(300_000));
  await expect(page.getByTestId("expenses-list")).toContainText("Ish haqi");

  // Moliya hisoboti: Chilonzor tushumi 650 000 (urug') + 1 000 000; sof foyda = tushum − 300 000
  await page.goto(`${base}/reports/finance`);
  await expect(page.getByTestId("report-revenue-value")).toHaveText(formatMoney(1_650_000));
  await expect(page.getByTestId("report-expenses-value")).toHaveText(formatMoney(300_000));
  await expect(page.getByTestId("report-profit-value")).toHaveText(formatMoney(1_350_000));
  await page.goto(`${base}/dashboard`);
  await expect(page.getByTestId("card-profit-value")).toHaveText(formatMoney(1_350_000));

  // Ustoz: "Mening oyligim" — faqat o'zi
  await logout(page);
  await login(page, teacher.local, "ustozparol1");
  await expect(page).toHaveURL(/\/dashboard$/);
  const nav = await openNav(page);
  await nav.getByRole("link", { name: "Mening oyligim" }).click();
  await expect(page.getByTestId("salary-accrued")).toHaveText(formatMoney(300_000));
  await expect(page.getByTestId("salary-paid")).toHaveText(formatMoney(300_000));
  await shot(page, "my-salary", info.project.name);
  await page.goto(`${base}/finance/salary`);
  await expect(page.getByRole("heading", { name: "Sizda bu bo'limga ruxsat yo'q" })).toBeVisible();
});

test("xarajat va kassa: qo'ldagi pul, topshirish, bekor qilish, savat", async ({ page }, info) => {
  await registerOrg(page);
  const b1 = branchIdFrom(page);
  const base = `/${b1}`;
  await seedMetricsScenario(b1);

  // Egasi naqd 500 000 qabul qiladi → qo'lida 500 000
  await pay(page, base, "A1", 500_000);
  await page.goto(`${base}/finance/cash`);
  await expect(page.getByTestId("my-cash-Naqd")).toHaveText(formatMoney(500_000));

  // Xarajat (o'z qo'lidan) 50 000
  await page.goto(`${base}/finance/expenses`);
  await page.getByRole("button", { name: "Xarajat qo'shish" }).click();
  const dialog = page.getByTestId("expense-dialog");
  await dialog.getByLabel("Summa").fill("50000");
  await pick(page, dialog, "Turkum", "Kommunal xizmatlar");
  await dialog.getByLabel("Oluvchi").fill("Suv");
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("expenses-total")).toHaveText(formatMoney(50_000));
  await shot(page, "expenses", info.project.name);

  // Kassaga 200 000 topshirish
  await page.goto(`${base}/finance/cash`);
  await expect(page.getByTestId("my-cash-Naqd")).toHaveText(formatMoney(450_000));
  await page.getByRole("button", { name: "Pul topshirish" }).click();
  const handover = page.getByTestId("handover-dialog");
  await expect(handover.getByTestId("handover-available")).toContainText(formatMoney(450_000));
  await pick(page, handover, "Kimga", "Filial kassasi");
  await handover.getByLabel("Summa").fill("200000");
  await handover.getByRole("button", { name: "Topshirish" }).click();
  await expect(handover).toBeHidden();
  await expect(page.getByTestId("my-cash-Naqd")).toHaveText(formatMoney(250_000));
  await expect(
    page
      .getByTestId("cash-positions")
      .locator('[data-holder="Filial kassasi — Chilonzor"]')
      .getByTestId("cash-closing"),
  ).toHaveText(formatMoney(200_000));
  await shot(page, "cash", info.project.name);

  // Topshirishni bekor qilish (sabab majburiy)
  await page.getByTestId("cash-history").getByRole("button", { name: "Bekor qilish" }).click();
  await page.getByLabel("Sabab").fill("Xato summa");
  await page.getByRole("button", { name: "Topshirishni bekor qilish" }).click();
  await expect(page.getByTestId("my-cash-Naqd")).toHaveText(formatMoney(450_000));

  // Xarajatni savatga va qaytarish
  await page.goto(`${base}/finance/expenses`);
  await page.getByTestId("expenses-list").getByRole("button", { name: "Amallar" }).click();
  await page.getByRole("menuitem", { name: "Savatga" }).click();
  await page.getByRole("button", { name: "Savatga o'tkazish" }).click();
  await expect(page.getByText("Bu davrda xarajat yo'q")).toBeVisible();
  await page.getByRole("link", { name: "Savat" }).click();
  await expect(page.getByTestId("expenses-total")).toHaveText(formatMoney(50_000));
  await page.getByRole("button", { name: "Qaytarish" }).click();
  await expect(page.getByText("Savat bo'sh")).toBeVisible();
  await page.goto(`${base}/finance/cash`);
  await expect(page.getByTestId("my-cash-Naqd")).toHaveText(formatMoney(450_000));
});
