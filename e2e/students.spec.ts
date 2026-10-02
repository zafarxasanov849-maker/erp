import { type Page, expect, test } from "@playwright/test";

import { branchIdFrom, randomPhone, registerOrg } from "./helpers";

async function pick(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function setupGroups(page: Page, base: string) {
  await page.goto(`${base}/settings/courses`);
  await page.getByRole("button", { name: "Kurs qo'shish" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nomi").fill("Matematika");
  await dialog.getByLabel("Oylik narx").fill("500000");
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("row", { name: /Matematika/ })).toBeVisible();

  for (const g of [
    { name: "M1", days: ["Du", "Ch", "Ju"] },
    { name: "M2", days: ["Se", "Pa", "Sh"] },
  ]) {
    await page.goto(`${base}/groups/new`);
    await expect(page.getByRole("heading", { name: "Guruh ochish" })).toBeVisible();
    await page.getByLabel("Guruh nomi").fill(g.name);
    await pick(page, "Kurs", "Matematika");
    for (const d of g.days) await page.getByRole("button", { name: d, exact: true }).click();
    await page.getByLabel("Boshlanishi").fill("10:00");
    await page.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByRole("heading", { level: 1, name: g.name })).toBeVisible();
  }
}

/** Header'dagi "+ Talaba" → panel → saqlash */
async function addStudent(
  page: Page,
  s: { name: string; phone: string; groups?: { name: string; status: "Sinovda" | "Faol" }[] },
) {
  await page.getByTestId("add-student").click();
  const sheet = page.getByTestId("student-sheet");
  await expect(sheet.getByLabel("To'liq ism")).toBeVisible();
  await sheet.getByLabel("To'liq ism").fill(s.name);
  await sheet.getByLabel("Telefon").fill(s.phone);
  for (const g of s.groups ?? []) {
    await sheet.getByRole("button", { name: "Guruhga qo'shish" }).click();
    await sheet
      .getByTestId("group-search-results")
      .getByRole("button", { name: new RegExp(`^${g.name}`) })
      .click();
    const card = sheet.getByTestId("enrollment-card").filter({ hasText: g.name });
    await card.getByRole("radio", { name: g.status }).click();
  }
  await sheet.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Talaba qo'shildi")).toBeVisible();
  await expect(sheet).toBeHidden();
}

test("talaba: 2 guruhga qo'shish → muzlatish → chiqarish → tarix", async ({ page }) => {
  await registerOrg(page);
  const base = `/${branchIdFrom(page)}`;
  await setupGroups(page, base);

  const phone = randomPhone();
  await page.goto(`${base}/students`);
  await expect(page.getByText("Hali talaba yo'q")).toBeVisible();
  await addStudent(page, {
    name: "Eshmatova Mohira",
    phone: phone.local,
    groups: [
      { name: "M1", status: "Faol" },
      { name: "M2", status: "Sinovda" },
    ],
  });

  // Takror telefon — ogohlantirish va profilga havola
  await page.getByTestId("add-student").click();
  const sheet = page.getByTestId("student-sheet");
  await sheet.getByLabel("Telefon").fill(phone.local);
  await expect(sheet.getByTestId("duplicate-phone")).toContainText("Eshmatova Mohira");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  // Ro'yxat
  await page.goto(`${base}/students`);
  const row = page.getByRole("row", { name: /Eshmatova Mohira/ });
  await expect(row).toContainText("M1");
  await expect(row).toContainText("M2");
  await expect(row).toContainText("Faol");

  // Profil
  await row.getByRole("link", { name: "Eshmatova Mohira" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Eshmatova Mohira/ })).toBeVisible();
  const m1 = page.locator('[data-testid="enrollment"][data-group="M1"]');
  const m2 = page.locator('[data-testid="enrollment"][data-group="M2"]');
  await expect(m1).toContainText("Faol");
  await expect(m2).toContainText("Sinovda");

  // M1 ni muzlatish (bugundan 10 kunga)
  await m1.getByRole("button", { name: "Amallar" }).click();
  await page.getByRole("menuitem", { name: "Muzlatish" }).click();
  const freeze = page.getByRole("dialog");
  const from = await freeze.getByLabel("Boshlanishi").inputValue();
  const [d, m, y] = from.split(".").map(Number);
  const to = new Date(Date.UTC(y!, m! - 1, d! + 10));
  const toUi = `${String(to.getUTCDate()).padStart(2, "0")}.${String(to.getUTCMonth() + 1).padStart(2, "0")}.${to.getUTCFullYear()}`;
  await freeze.getByLabel("Tugashi").fill(toUi);
  await freeze.getByRole("button", { name: "Saqlash" }).click();
  await expect(freeze).toBeHidden();
  await expect(m1).toContainText("Muzlatilgan");
  await expect(m1).toContainText(toUi);

  // M2 dan chiqarish — sababsiz bo'lmaydi
  await m2.getByRole("button", { name: "Amallar" }).click();
  await page.getByRole("menuitem", { name: "Guruhdan chiqarish" }).click();
  const leave = page.getByRole("dialog");
  await leave.getByRole("button", { name: "Saqlash" }).click();
  await expect(leave.getByText("Sababni tanlang")).toBeVisible();
  await leave.getByRole("combobox").click();
  await page.getByRole("option", { name: "Ko'chib ketdi" }).click();
  await leave.getByRole("button", { name: "Saqlash" }).click();
  await expect(leave).toBeHidden();
  await expect(m2).toBeHidden();
  await page.getByRole("button", { name: "Chiqqan guruhlar (1)" }).click();
  await expect(m2).toContainText("Chiqqan");
  await expect(m2).toContainText("Ko'chib ketdi");

  // Izoh
  await page.getByRole("tab", { name: "Izohlar" }).click();
  await page.getByPlaceholder("Izoh yozing…").fill("Onasi kechqurun qo'ng'iroq qiladi");
  await page.getByRole("button", { name: "Qo'shish" }).click();
  await expect(page.getByTestId("note")).toContainText("Onasi kechqurun");

  // Tarix: hammasi ko'rinadi
  await page.getByRole("tab", { name: "O'zgarishlar tarixi" }).click();
  const history = page.getByTestId("history");
  await expect(history).toContainText("Talaba qo'shildi");
  await expect(history).toContainText("Guruhga qo'shildi: M1");
  await expect(history).toContainText("Guruhga qo'shildi: M2");
  await expect(history).toContainText("Muzlatildi: M1");
  await expect(history).toContainText(/A'zolik o'zgardi: M2[\s\S]*Chiqqan/);
  await expect(history).toContainText("Ko'chib ketdi");
  await expect(history).toContainText("Izoh qo'shildi");

  // Arxivlash: ochiq a'zolik (M1) bor — bo'lmaydi
  page.once("dialog", (dlg) => void dlg.accept());
  await page.getByRole("button", { name: "Arxivlash" }).click();
  await expect(page.getByText("Talaba hali guruhlarda")).toBeVisible();
});

test("talabalar ro'yxati: qidiruv, filtr, teg, guruh sahifasi", async ({ page }) => {
  await registerOrg(page);
  const base = `/${branchIdFrom(page)}`;
  await setupGroups(page, base);

  // Teg
  await page.goto(`${base}/settings/tags`);
  await expect(page.getByText("Hali teg yo'q")).toBeVisible();
  await page.getByRole("button", { name: "Teg qo'shish" }).click();
  await page.getByRole("dialog").getByLabel("Nomi").fill("VIP");
  await page.getByRole("dialog").getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("row", { name: /VIP/ })).toBeVisible();

  // Guruh sahifasidan talaba qo'shish (guruh oldindan tanlangan)
  await page.goto(`${base}/groups`);
  await page.getByRole("link", { name: "M1" }).click();
  await page.getByRole("tab", { name: /Talabalar/ }).click();
  await expect(page.getByText("Guruhda talaba yo'q")).toBeVisible();
  await page.getByRole("button", { name: "Talaba qo'shish" }).click();
  const sheet = page.getByTestId("student-sheet");
  await expect(sheet.getByTestId("enrollment-card")).toContainText("M1");
  await sheet.getByLabel("To'liq ism").fill("Karimov Bobur");
  await sheet.getByLabel("Telefon").fill(randomPhone().local);
  await sheet.getByRole("button", { name: "Saqlash" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByTestId("group-members")).toContainText("Karimov Bobur");
  await expect(page.getByTestId("group-members")).toContainText("Sinovda");

  // Guruhsiz talaba
  await addStudent(page, { name: "Aliyeva Nodira", phone: randomPhone().local });

  await page.goto(`${base}/students`);
  await expect(page.getByTestId("students-total")).toHaveText("Jami: 2");

  // Qidiruv (URL'da saqlanadi)
  await page.getByLabel("Ism yoki telefon").fill("nodira");
  await expect(page).toHaveURL(/q=nodira/);
  await expect(page.getByTestId("students-total")).toHaveText("Jami: 1");
  await page.reload();
  await expect(page.getByLabel("Ism yoki telefon")).toHaveValue("nodira");
  await expect(page.getByRole("row", { name: /Aliyeva Nodira/ })).toContainText("Guruhsiz");
  await page.getByRole("button", { name: "Tozalash" }).click();
  await expect(page.getByTestId("students-total")).toHaveText("Jami: 2");

  // Holat filtri
  await pick(page, "Holati", "Sinovda");
  await expect(page.getByTestId("students-total")).toHaveText("Jami: 1");
  await expect(page.getByRole("row", { name: /Karimov Bobur/ })).toBeVisible();
  await page.getByRole("button", { name: "Tozalash" }).click();
  await expect(page.getByTestId("students-total")).toHaveText("Jami: 2");

  // Ommaviy teg qo'shish → teg filtri
  await page.getByRole("checkbox", { name: "Hammasini tanlash" }).click();
  await expect(page.getByTestId("bulk-bar")).toContainText("Tanlandi: 2");
  await page.getByRole("button", { name: "Teg qo'shish" }).click();
  await page.getByRole("menuitem", { name: "VIP" }).click();
  await expect(page.getByText("Teg qo'shildi")).toBeVisible();
  await pick(page, "Teg", "VIP");
  await expect(page.getByTestId("students-total")).toHaveText("Jami: 2");

  // Excel eksport
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel" }).click();
  expect((await download).suggestedFilename()).toMatch(/^talabalar-\d{2}\.\d{2}\.\d{4}\.xlsx$/);
});
