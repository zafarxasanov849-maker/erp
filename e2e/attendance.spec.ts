import { type Page, expect, test } from "@playwright/test";

import { seedGroupStudents, seedPastLessons } from "./db";
import { branchIdFrom, login, logout, randomPhone, registerOrg } from "./helpers";

const DAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

/** Toshkent bo'yicha bugun (ISO) va n kun oldin */
function isoDay(offset = 0): string {
  const d = new Date(Date.now() + 5 * 3600_000 + offset * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function pick(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** Kurs + har kuni dars bo'ladigan guruh (bugun ham dars bor). Guruh id qaytaradi. */
async function setupGroup(page: Page, base: string, opts: { teacher?: string } = {}) {
  await page.goto(`${base}/settings/courses`);
  await page.getByRole("button", { name: "Kurs qo'shish" }).click();
  await page.getByRole("dialog").getByLabel("Nomi").fill("Ingliz tili");
  await page.getByRole("dialog").getByLabel("Oylik narx").fill("600000");
  await page.getByRole("dialog").getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("row", { name: /Ingliz tili/ })).toBeVisible();

  await page.goto(`${base}/groups/new`);
  await expect(page.getByRole("heading", { name: "Guruh ochish" })).toBeVisible();
  await page.getByLabel("Guruh nomi").fill("A1");
  await pick(page, "Kurs", "Ingliz tili");
  if (opts.teacher) await pick(page, "Ustoz", opts.teacher);
  for (const d of DAYS) await page.getByRole("button", { name: d, exact: true }).click();
  await page.getByLabel("Boshlanishi").fill("09:00");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "A1" })).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop()!;
}

test("ustoz telefonda 15 talabali guruhni 20 soniyada belgilaydi", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "ROADMAP mezoni — telefon brauzerida");
  await registerOrg(page);
  const branchId = branchIdFrom(page);
  const base = `/${branchId}`;

  // Egasi ustozni qo'shadi
  await page.goto(`${base}/settings/staff`);
  await page.getByRole("button", { name: "Xodim qo'shish" }).click();
  const sheet = page.getByRole("dialog");
  const teacher = randomPhone();
  await sheet.getByLabel("Ism va familiya").fill("Dilnoza Ustoz");
  await sheet.getByLabel("Telefon").fill(teacher.local);
  await sheet.getByRole("combobox").click();
  await page.getByRole("option", { name: "Ustoz" }).click();
  await sheet.getByLabel("Ustoz (guruhlarga biriktiriladi)").check();
  const tempPassword = await sheet.getByLabel("Vaqtinchalik parol").inputValue();
  await sheet.getByRole("button", { name: "Xodim qo'shish" }).click();
  await expect(sheet.getByTestId("temp-password")).toHaveText(tempPassword);
  await sheet.getByRole("button", { name: "Tayyor" }).click();

  const groupId = await setupGroup(page, base, { teacher: "Dilnoza Ustoz" });
  const names = Array.from({ length: 15 }, (_, i) => `Talaba ${String(i + 1).padStart(2, "0")}`);
  await seedGroupStudents(groupId, names, isoDay(-7));

  await logout(page);
  await login(page, teacher.local, tempPassword);
  await page.getByLabel("Yangi parol").fill("ustozparol1");
  await page.getByLabel("Parolni takrorlang").fill("ustozparol1");
  await page.getByRole("button", { name: "Parolni saqlash" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // --- Vaqt o'lchanadi: Bugungi darslar → Davomat qilish → Hammasi keldi → 3 ta istisno → saqlandi
  await page.goto(`${base}/today`);
  const card = page.getByTestId("today-lessons").locator('[data-group="A1"]');
  await expect(card.getByTestId("lesson-status")).toHaveText("Belgilanmagan");
  const started = Date.now();

  await card.getByRole("link", { name: "Davomat qilish" }).click();
  await page.getByRole("button", { name: "Hammasi keldi" }).click();
  await page.getByRole("radio", { name: "Talaba 03: Kelmadi" }).click();
  await page.getByRole("radio", { name: "Talaba 07: Kelmadi" }).click();
  await page.getByRole("radio", { name: "Talaba 11: Kechikdi" }).click();
  await expect(page.getByTestId("lesson-progress")).toHaveText("15/15 belgilandi");
  await expect(page.getByTestId("save-state")).toHaveText("Saqlandi");

  const elapsed = Date.now() - started;
  console.log(`Davomat: 15 talaba, ${elapsed} ms`);
  expect(elapsed).toBeLessThan(20_000);

  // Saqlangan: sahifani yangilasa ham turadi
  await page.reload();
  const row = (n: string) => page.getByTestId("lesson-students").locator(`[data-student="${n}"]`);
  await expect(row("Talaba 03")).toHaveAttribute("data-mark", "absent");
  await expect(row("Talaba 11")).toHaveAttribute("data-mark", "late");
  await expect(row("Talaba 01")).toHaveAttribute("data-mark", "present");

  // Mavzu va uy vazifasi
  await page.getByLabel("Mavzu").fill("Present Simple");
  await page.getByLabel("Uy vazifasi").fill("12-mashq");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Saqlandi").first()).toBeVisible();

  await page.goto(`${base}/today`);
  await expect(card.getByTestId("lesson-status")).toHaveText("Belgilangan 15/15");
});

test("jurnal: katakni aylantirish, ustun bo'yicha 'Hammasi keldi', kelmayotganlar, profil", async ({
  page,
}) => {
  await registerOrg(page);
  const base = `/${branchIdFrom(page)}`;

  // Sozlamalar → Markaz: davomat sozlamalari saqlanadi
  await page.goto(`${base}/settings/organization`);
  await expect(page.getByLabel("Kelmayotganlar chegarasi (dars)")).toHaveValue("3");
  await page.getByLabel("Ustoz tahrirlash muddati (kun)").fill("3");
  await page.getByRole("button", { name: "Saqlash" }).click();
  await expect(page.getByText("Saqlandi")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Ustoz tahrirlash muddati (kun)")).toHaveValue("3");

  const groupId = await setupGroup(page, base);
  const [ali, vali] = await seedGroupStudents(groupId, ["Ali Valiyev", "Vali Aliyev"], isoDay(-10));
  void ali;
  // O'tgan 3 dars (bugun bilan bir oyda bo'lmasligi mumkin — jurnalni bugungi oyda tekshiramiz)
  await seedPastLessons(groupId, [isoDay(-3), isoDay(-2), isoDay(-1)]);

  // Davomatni dars sahifasidan: Vali 3 dars ketma-ket kelmadi
  await page.goto(`${base}/groups/${groupId}?tab=attendance&month=${isoDay(-3).slice(0, 7)}`);
  const journal = page.getByTestId("attendance-journal");
  await expect(journal).toBeVisible();
  for (const d of [isoDay(-3), isoDay(-2), isoDay(-1)]) {
    await page.goto(`${base}/groups/${groupId}?tab=attendance&month=${d.slice(0, 7)}`);
    const cell = journal.locator(`[data-cell="Vali Aliyev|${d}"]`);
    for (let i = 0; i < 3; i++) await cell.click(); // bo'sh → K → Kch → Y
    await expect(cell).toHaveAttribute("data-mark", "absent");
    await expect(journal.getByTestId("save-state")).toHaveText("Saqlandi");
  }

  // Bugungi ustun: "Hammasi keldi"
  const today = isoDay();
  await page.goto(`${base}/groups/${groupId}?tab=attendance&month=${today.slice(0, 7)}`);
  await journal.locator(`th[data-lesson="${today}"]`).getByRole("button").click();
  await page.getByRole("menuitem", { name: "Hammasi keldi" }).click();
  await expect(journal.locator(`[data-cell="Ali Valiyev|${today}"]`)).toHaveAttribute(
    "data-mark",
    "present",
  );
  await expect(journal.locator(`[data-cell="Vali Aliyev|${today}"]`)).toHaveAttribute(
    "data-mark",
    "present",
  );
  await expect(journal.getByTestId("save-state")).toHaveText("Saqlandi");

  // Ertangi dars belgilanmaydi (tugma emas)
  const tomorrow = isoDay(1);
  if (tomorrow.slice(0, 7) === today.slice(0, 7)) {
    await expect(journal.locator(`button[data-cell="Ali Valiyev|${tomorrow}"]`)).toHaveCount(0);
  }

  // Bugun "Keldi" — ketma-ketlik uzildi; kechagi holat bo'yicha tekshirish uchun bugungini olib tashlaymiz
  const valiToday = journal.locator(`[data-cell="Vali Aliyev|${today}"]`);
  for (let i = 0; i < 4; i++) await valiToday.click(); // K → Kch → Y → S → bo'sh
  await expect(valiToday).toHaveAttribute("data-mark", "");
  await expect(journal.getByTestId("save-state")).toHaveText("Saqlandi");

  // Kelmayotganlar (chegara 3)
  await page.goto(`${base}/today`);
  await expect(page.getByTestId("absentees")).toContainText("Vali Aliyev");
  await expect(page.getByTestId("absentees")).toContainText("3 dars ketma-ket");
  await expect(page.getByTestId("absentees")).not.toContainText("Ali Valiyev");

  // Profil → Davomat
  await page.goto(`${base}/students/${vali!.id}`);
  await page.getByRole("tab", { name: "Davomat" }).click();
  const att = page.getByTestId("student-attendance");
  await expect(att).toContainText("A1");
  await expect(att).toContainText("Kelmadi: 3");
});
