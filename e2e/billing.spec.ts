import { type Page, expect, test } from "@playwright/test";

import { lessonsInPeriod, roundDiv } from "../src/lib/billing/calc";
import { formatMoney } from "../src/lib/money";

import { branchIdFrom, randomPhone, registerOrg } from "./helpers";

const DAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const PRICE = 600_000;

/** Toshkent bo'yicha bugun */
function today(): string {
  return new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
}
function monthEnd(iso: string): string {
  const [y, m] = iso.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/**
 * Har kuni dars bo'ladigan guruh: bugundan oy oxirigacha n dars, oyda `full` dars.
 * Kutilgan yechish — lib/billing bilan bir xil formula (§5.3), yaxlitlash 1 000 so'm.
 */
function expectedCharge(rounding: 1 | 100 | 1000) {
  const t = today();
  const all = { weekdays: [1, 2, 3, 4, 5, 6, 7], startDate: t, endDate: null };
  const n = lessonsInPeriod(all, t, monthEnd(t)).length;
  const full = lessonsInPeriod(
    { ...all, startDate: `${t.slice(0, 8)}01` },
    `${t.slice(0, 8)}01`,
    monthEnd(t),
  ).length;
  return { n, full, amount: roundDiv(PRICE * n, full, rounding) };
}

const money = (v: number) => formatMoney(v);

async function pick(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("to'lov: yechish → to'lov → chek → bekor qilish → qarzdor → chegirma", async ({ page }) => {
  await registerOrg(page);
  const base = `/${branchIdFrom(page)}`;

  // Moliya sozlamasi: yaxlitlash 1 000 so'mgacha
  await page.goto(`${base}/settings/organization`);
  await pick(page, "Yaxlitlash", "1 000 so'mgacha");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Saqlandi")).toBeVisible();

  // Kurs va har kuni dars bo'ladigan guruh
  await page.goto(`${base}/settings/courses`);
  await page.getByRole("button", { name: "Kurs qo'shish" }).click();
  await page.getByRole("dialog").getByLabel("Nomi").fill("Matematika");
  await page.getByRole("dialog").getByLabel("Oylik narx").fill(String(PRICE));
  await page.getByRole("dialog").getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("row", { name: /Matematika/ })).toBeVisible();
  await page.goto(`${base}/groups/new`);
  await page.getByLabel("Guruh nomi").fill("M1");
  await pick(page, "Kurs", "Matematika");
  for (const d of DAYS) await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByLabel("Boshlanishi").fill("10:00");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "M1" })).toBeVisible();

  // Talaba darhol "Faol" — §5.3: qolgan darslar uchun darhol yechiladi
  await page.getByRole("tab", { name: /Talabalar/ }).click();
  await page.getByRole("button", { name: "Talaba qo'shish" }).click();
  const sheet = page.getByTestId("student-sheet");
  await sheet.getByLabel("To'liq ism").fill("Qarzdor Qodir");
  await sheet.getByLabel("Telefon").fill(randomPhone().local);
  await sheet.getByTestId("enrollment-card").getByRole("radio", { name: "Faol" }).click();
  await sheet.getByRole("button", { name: "Saqlash" }).click();
  await expect(sheet).toBeHidden();
  await page.getByTestId("group-members").getByRole("link", { name: "Qarzdor Qodir" }).click();

  const { n, full, amount } = expectedCharge(1000);
  await expect(page.getByTestId("header-balance")).toHaveText(money(-amount));
  await page.getByRole("tab", { name: "To'lovlar" }).click();
  const ledger = page.getByTestId("ledger");
  await expect(ledger.locator('[data-kind="charge"]')).toContainText(`${n}/${full} dars`);
  await expect(ledger.locator('[data-kind="charge"] [data-testid="ledger-amount"]')).toHaveText(
    formatMoney(-amount, { signed: true }),
  );

  // To'lov: summa avtomatik = qarz
  await page.getByRole("button", { name: "To'lov qabul qilish" }).click();
  const dialog = page.getByTestId("payment-dialog");
  await expect(dialog.getByLabel("Summa")).toHaveValue(formatMoney(amount, { currency: false }));
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText(/To'lov qabul qilindi · chek №1/)).toBeVisible();
  await expect(page.getByTestId("balance")).toHaveText(money(0));

  // Chek
  const receiptLink = ledger.getByRole("link", { name: "Chek №1" });
  const href = await receiptLink.getAttribute("href");
  await page.goto(href!);
  await expect(page.getByTestId("receipt-total")).toHaveText(money(amount));
  await expect(page.getByTestId("receipt")).toContainText("Qarzdor Qodir");
  await page.goBack();

  // Bekor qilish — sabab majburiy
  await page.getByRole("tab", { name: "To'lovlar" }).click();
  await page.getByRole("button", { name: "To'lovni bekor qilish" }).click();
  const voidDialog = page.getByRole("dialog");
  await voidDialog.getByRole("button", { name: "To'lovni bekor qilish" }).click();
  await expect(voidDialog.getByText("Sababni yozing")).toBeVisible();
  await voidDialog.getByLabel("Sabab").fill("Summa xato");
  await voidDialog.getByRole("button", { name: "To'lovni bekor qilish" }).click();
  await expect(page.getByText("To'lov bekor qilindi").first()).toBeVisible();
  await expect(page.getByTestId("balance")).toHaveText(money(-amount));
  await page.goto(href!);
  await expect(page.getByTestId("receipt-voided")).toContainText("BEKOR QILINGAN");
  await page.goBack();

  // Qisman to'lov 100 000 → qarzdor
  await page.getByRole("button", { name: "To'lov qabul qilish" }).click();
  await page.getByTestId("payment-dialog").getByLabel("Summa").fill("100000");
  await page.getByTestId("payment-dialog").getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText(/chek №2/)).toBeVisible();
  const debt = amount - 100_000;

  await page.goto(`${base}/finance`);
  const debtors = page.getByTestId("debtors");
  await expect(debtors.getByRole("row", { name: /Qarzdor Qodir/ })).toContainText(money(-debt));
  await expect(page.getByTestId("debtors-total")).toContainText("1 talaba");

  // Ro'yxat: Balans ustuni va "Qarzdorlar" filtri
  await page.goto(`${base}/students`);
  await expect(page.getByRole("row", { name: /Qarzdor Qodir/ })).toContainText(money(-debt));
  await pick(page, "Holati", "Qarzdorlar");
  await expect(page.getByTestId("students-total")).toHaveText("Jami: 1");

  // Chegirma 10% bugundan → yechilgan darslar farqi qaytariladi (C-qoida)
  await page.getByRole("link", { name: "Qarzdor Qodir" }).click();
  await page
    .locator('[data-testid="enrollment"][data-group="M1"]')
    .getByRole("button", { name: "Amallar" })
    .click();
  await page.getByRole("menuitem", { name: "Chegirma" }).click();
  const dDialog = page.getByRole("dialog");
  await dDialog.getByLabel("Qiymati").fill("10");
  await dDialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByTestId("discounts")).toContainText("Chegirma 10%");
  const refund = roundDiv(60_000 * n, full, 1000);
  await page.getByRole("tab", { name: "To'lovlar" }).click();
  await expect(ledger.locator('[data-kind="adjustment"]').first()).toContainText("Chegirma");
  await expect(
    ledger.locator('[data-kind="adjustment"] [data-testid="ledger-amount"]').first(),
  ).toHaveText(formatMoney(refund, { signed: true }));
  await expect(page.getByTestId("balance")).toHaveText(money(-debt + refund));
});

test("tungi cron: hisob-kitob idempotent", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "bitta loyihada yetarli");
  const secret = process.env.CRON_SECRET ?? "e2e-cron-secret";
  expect((await request.get("/api/cron/nightly")).status()).toBe(401);
  const first = await request.get("/api/cron/nightly", {
    headers: { authorization: `Bearer ${secret}` },
  });
  expect(first.status()).toBe(200);
  // Ikkinchi marta — hech qanday yangi yozuv yo'q
  const second = await request.get("/api/cron/nightly", {
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = (await second.json()) as { billing: Record<string, { transactions: number }> };
  for (const r of Object.values(body.billing)) expect(r.transactions).toBe(0);
});
