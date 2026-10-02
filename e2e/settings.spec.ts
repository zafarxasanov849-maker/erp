import { expect, test } from "@playwright/test";

import { branchIdFrom, login, logout, openNav, randomPhone, registerOrg } from "./helpers";

test("admin xodim: vaqtinchalik parol → yangi parol → Rollar sahifasiga kira olmaydi", async ({
  page,
}) => {
  await registerOrg(page);
  const branchId = branchIdFrom(page);

  // Egasi admin qo'shadi
  await page.goto(`/${branchId}/settings/staff`);
  await page.getByRole("button", { name: "Xodim qo'shish" }).click();
  const sheet = page.getByRole("dialog");
  const admin = randomPhone();
  await sheet.getByLabel("Ism va familiya").fill("Charos Admin");
  await sheet.getByLabel("Telefon").fill(admin.local);
  await sheet.getByRole("combobox").click();
  await page.getByRole("option", { name: "Admin" }).click();
  const tempPassword = await sheet.getByLabel("Vaqtinchalik parol").inputValue();
  await sheet.getByRole("button", { name: "Xodim qo'shish" }).click();
  await expect(sheet.getByTestId("temp-password")).toHaveText(tempPassword);
  await sheet.getByRole("button", { name: "Tayyor" }).click();
  await expect(page.getByRole("row", { name: /Charos Admin/ })).toContainText("Admin");

  // Admin kiradi → parolni almashtirishga majbur
  await logout(page);
  await login(page, admin.local, tempPassword);
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel("Yangi parol").fill("adminparol1");
  await page.getByLabel("Parolni takrorlang").fill("adminparol1");
  await page.getByRole("button", { name: "Parolni saqlash" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Menyuda Sozlamalar yo'q, to'g'ridan-to'g'ri kirsa 403
  const nav = await openNav(page);
  await expect(nav.getByRole("link", { name: "Talabalar" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sozlamalar" })).toHaveCount(0);
  if ((await nav.getAttribute("role")) === "dialog") await page.keyboard.press("Escape");

  const res = await page.goto(`/${branchId}/settings/roles`);
  expect(res?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Sizda bu bo'limga ruxsat yo'q" })).toBeVisible();
});

test("ikki markaz bir-birining filialini ko'rmaydi", async ({ page }) => {
  await registerOrg(page, { orgName: "Birinchi markaz" });
  const branchA = branchIdFrom(page);
  await logout(page);

  await registerOrg(page, { orgName: "Ikkinchi markaz" });
  const res = await page.goto(`/${branchA}/dashboard`);
  expect(res?.status()).toBe(403);
  await page.goto("/");
  await page.getByRole("button", { name: "Filialni tanlash" }).click();
  await expect(page.getByRole("menuitem")).not.toContainText(["Birinchi markaz"]);
});

test("filial va rol qo'shish", async ({ page }) => {
  await registerOrg(page);
  const branchId = branchIdFrom(page);

  // Filial
  await page.goto(`/${branchId}/settings/branches`);
  await page.getByRole("button", { name: "Filial qo'shish" }).click();
  await page.getByRole("dialog").getByLabel("Nomi").fill("Yunusobod");
  await page.getByRole("dialog").getByLabel("Manzil").fill("Amir Temur 1");
  await page.getByRole("dialog").getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("row", { name: /Yunusobod/ })).toBeVisible();
  await page.getByRole("button", { name: "Filialni tanlash" }).click();
  await expect(page.getByRole("menuitem", { name: "Yunusobod" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Rol: guruh checkbox'i bilan "Talabalar" ning hammasi
  await page.goto(`/${branchId}/settings/roles`);
  await expect(page.getByRole("row", { name: /Egasi/ })).toContainText("Hammasi");
  await page.getByRole("link", { name: "Rol qo'shish" }).click();
  await page.getByLabel("Nomi").fill("Kassir");
  await page.getByRole("checkbox", { name: "Talabalar" }).click();
  await page.getByRole("checkbox", { name: "To'lov qabul qilish" }).click();
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page).toHaveURL(/\/settings\/roles$/);
  await expect(page.getByRole("row", { name: /Kassir/ })).toContainText("6");
});
