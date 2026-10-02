# ROADMAP — Claude Code bilan qurish bosqichlari

Har bosqich = alohida Claude Code sessiyasi. Tartib:
1. Yangi sessiya oching (`/clear`), **Plan mode** yoqing (Shift+Tab ikki marta).
2. Quyidagi promptni nusxalab bering. Claude reja yozadi — o'qing, kerak bo'lsa tuzating, tasdiqlang.
3. Tugagach "Tayyor bo'lish mezonlari"ni o'zingiz brauzerda tekshiring.
4. `pnpm lint && pnpm typecheck && pnpm test` o'tsa — commit qiling va keyingi bosqichga o'ting.

Bir sessiyada bitta bosqich. Kontekst to'lib qolsa `/compact` qiling yoki bosqichni ikkiga bo'ling.

Taxminiy muddat — kuniga 3–4 soat ishlaganda.

| # | Bosqich | Muddat |
|---|---|---|
| 0 | Loyiha poydevori | 1 kun |
| 1 | Markaz, auth, rollar, filiallar, xodimlar | 3–4 kun |
| 2 | Kurslar, xonalar, guruhlar, darslar jadvali | 3 kun |
| 3 | Talabalar va a'zoliklar | 3–4 kun |
| 4 | Davomat jurnali | 2–3 kun |
| 5 | Hisob-kitob dvigateli va to'lovlar | 5–6 kun |
| 6 | Bosh sahifa (rolga qarab) va hisobotlar | 4 kun |
| 7 | Xarajatlar, kassa, ish haqi | 4 kun |
| 8 | Sotuv varonkasi va lidlar | 3–4 kun |
| 9 | SMS va Telegram (ota-onalar guruhi, ustoz Mini App) | 5–6 kun |
| 10 | SaaS: tariflar, super-admin, ishga tushirish | 4–5 kun |

Jami ~6–8 hafta. 5-bosqich eng muhim — shoshilmang.

---

## 0. Loyiha poydevori

**Siz oldindan qilasiz:** GitHub repo yarating; supabase.com'da loyiha oching (region: Frankfurt); Docker o'rnating (lokal Supabase uchun); `CLAUDE.md` ni repo ildiziga, `docs/` papkasini ichiga qo'ying.

```
CLAUDE.md va docs/PRD.md ni o'qib chiq. Loyiha poydevorini qur:
- Next.js 15 (App Router, TypeScript strict, src/ papka), pnpm.
- Tailwind + shadcn/ui o'rnat; asosiy komponentlar: button, input, select, dialog, sheet, table, tabs, badge, card, dropdown-menu, toast, skeleton, form.
- next-intl: uz (default) va ru; barcha matnlar messages/uz.json va ru.json da.
- Supabase: lokal (supabase init/start), @supabase/ssr bilan server va klient helperlari, middleware'da sessiya yangilash.
- docs/schema.sql ni supabase/migrations/ ga birinchi migratsiya qilib ko'chir, `supabase db reset` ishlashini tekshir, TypeScript turlarini generatsiya qil.
- lib/money.ts (formatMoney: "1 250 000 so'm"), lib/dates.ts (KK.OO.YYYY, Asia/Tashkent), lib/phone.ts (+998 normalizatsiya va operator kodlarini tekshirish) — har biriga Vitest testlari.
- ESLint, Prettier, Vitest, Playwright sozla; package.json'ga lint, typecheck, test, e2e skriptlari.
- Ilova qobig'i: chap sidebar (Bosh sahifa, Sotuv, Talabalar, Guruhlar, Ustozlar, Moliya, Hisobotlar, Sozlamalar — "More" menyusi YO'Q), tepada filial tanlagich va foydalanuvchi menyusi, mobil kenglikda sidebar drawer'ga aylanadi.
- .env.example yoz. README'da ishga tushirish qadamlarini yoz.
Hali biznes-sahifalar qilma, faqat poydevor.
```

**Tayyor bo'lish mezonlari:** `pnpm dev` ochiladi, sidebar ko'rinadi, uz/ru almashadi, `supabase db reset` xatosiz, testlar o'tadi.

---

## 1. Markaz, auth, rollar, filiallar, xodimlar

```
PRD §2, §3.1 va §3.9 (filiallar, xodimlar, rollar) ni amalga oshir.
- Ro'yxatdan o'tish: markaz nomi, egasi ismi, telefon, parol. Telefonni SMS-kod bilan tasdiqlash uchun interfeys yarat (lib/sms.ts), hozircha dev rejimda kodni konsolga chiqar; Eskiz ulanishi 9-bosqichda.
  Supabase Auth'da telefonni email ko'rinishida saqlash kerak bo'lsa (masalan 998901234567@phone.local) — sababini izohda yoz.
- Ro'yxatdan o'tganda bitta tranzaksiyada: organizations, birinchi filial, 6 ta tizim roli (owner, ceo, manager, admin, sales, teacher — ruxsatlar to'plami lib/permissions.ts dan), egasi staff yozuvi, default to'lov turlari, xarajat turkumlari, sabablar va "Asosiy" varonka.
- Kirish, chiqish, parolni tiklash; bir nechta markazdagi foydalanuvchi uchun markaz tanlash sahifasi.
- lib/permissions.ts: barcha ruxsatlar ro'yxati (modul.amal), o'zbekcha nomlari bilan guruhlangan; requirePermission() server helperi.
- schema.sql dagi qolgan jadvallar uchun RLS siyosatlarini yoz va test qil: ikkinchi markaz foydalanuvchisi birinchi markaz ma'lumotlarini ko'rmasligi kerak (SQL test yoki Vitest + supabase-js).
- Sozlamalar: Markaz (nom, logo, rang, ish vaqti), Filiallar (CRUD), Rollar (ro'yxat, yaratish, tahrirlash — ruxsatlar guruhlar bo'yicha checkbox, "hammasi" tugmasi; tizim rolini o'chirib bo'lmaydi; qator bosilganda tahrirlash ochiladi), Xodimlar (qo'shish: ism, telefon, rol, filiallar, ustozmi; vaqtinchalik parol).
- Filial tanlagich URL'da [branchId] yoki "all"; ruxsati yo'q filialga kirsa 403 sahifa.
- Ruxsat yo'q sahifa va tarif cheklovi uchun ikki xil komponent (CLAUDE.md qoida 11).
- audit_log'ga rol va xodim o'zgarishlarini yoz.
```

**Mezon:** ikkita markaz ochib, biri ikkinchisining ma'lumotini hech qayerda ko'rmasligini tekshiring. Admin rolidagi xodim Rollar sahifasiga kira olmasligi kerak.

---

## 2. Kurslar, xonalar, guruhlar, darslar jadvali

```
PRD §3.4 va §3.9 (kurslar, xonalar, bayramlar) ni amalga oshir.
- Kurslar va xonalar CRUD.
- Guruh yaratish/tahrirlash formasi: nom, filial, kurs (narx kursdan meros, o'zgartirsa bo'ladi), ustoz, xona, hafta kunlari (Du..Ya chiplar), boshlanish/tugash vaqti, boshlanish sanasi.
  Saqlashdan oldin to'qnashuvni tekshir: shu xona yoki shu ustoz bir vaqtda boshqa guruhda bandmi — aniq xabar ber ("6-xona Du 12:00–13:30 da 10-guruh bilan band").
- Guruhlar ro'yxati: filtrlar (filial, kurs, ustoz, kun), har qatorda talabalar soni va keyingi dars.
- lib/schedule.ts: generateLessons(group, from, to, holidays) — toza funksiya, testlar bilan. Guruh saqlanganda 60 kunlik darslarni yarat; har kecha cron 60 kunga to'ldiradi; jadval o'zgarsa kelajakdagi (o'tmagan, davomatsiz) darslarni qayta yarat.
- Bayramlar: sana, filial yoki butun markaz, sabab → o'sha kundagi darslar status='cancelled'. (Pul qaytarish 5-bosqichda ulanadi — hozir hodisani chiqaradigan joyni belgilab qo'y.)
- Haftalik jadval ko'rinishi: xonalar × vaqt (filial bo'yicha).
```

**Mezon:** Du-Chor-Ju guruhi oktabr 2026 uchun 13 ta dars yaratadi; bayram qo'shilsa 12 ta qoladi.

---

## 3. Talabalar va a'zoliklar

```
PRD §3.3 ni amalga oshir (to'lov qismi 5-bosqichda).
- Talaba qo'shish o'ng panel (Sheet) — sidebar va istalgan joydan ochiladi. Maydonlar PRD'dagidek; "Maydon qo'shish" menyusi; "Guruhga qo'shish" bloki: guruh qidirish, kartochkada kurs·ustoz·kunlar·vaqt·xona, har tanlangan guruh uchun holat (Sinovda/Faol) va boshlanish sanasi.
  Telefon PhoneInput komponenti bilan, +998 maska. Takror telefon bo'lsa: "Bu raqam bilan Eshmatova Mohira bor — ochish" ogohlantirishi, baribir saqlash mumkin.
- Talabalar ro'yxati: TanStack Table, server tomonda sahifalash, saralash, filtrlar PRD'dagidek, filtrlar URL'da (nuqs), ustunlarni yashirish, Excel eksport (server action + exceljs), ommaviy tanlash.
- Talaba profili: sarlavhada ism, telefon, filial, teglar; tablar: Guruhlar, To'lovlar (bo'sh joy), Davomat, Izohlar, O'zgarishlar tarixi.
- A'zolik amallari: guruhga qo'shish, faollashtirish (sinovdan), boshqa guruhga o'tkazish (eski left + yangi active bitta tranzaksiyada), muzlatish (oraliq + sabab), chiqarish (sana + sabab majburiy), arxivlash. Har amal audit_log'ga.
  Pulga ta'sir qiladigan amallar uchun lib/billing'ga chaqiriladigan joyni tayyorla, lekin hisob-kitobni 5-bosqichda yoz.
- Teglar CRUD va talabaga biriktirish.
- Guruh sahifasiga talabalar ro'yxati tabini qo'sh.
```

**Mezon:** talabani 2 ta guruhga qo'shib, birini muzlatib, ikkinchisidan chiqarib ko'ring — tarixda hammasi ko'rinadi.

---

## 4. Davomat jurnali

```
PRD §3.5 ni amalga oshir.
- Guruh sahifasida Davomat tabi: oy tanlagich; qatorlar — talabalar (faqat o'sha sanada a'zo bo'lganlar), ustunlar — darslar (bekor qilinganlar kulrang). Katakni bosish holatni aylantiradi: bo'sh → Keldi → Kechikdi → Kelmadi → Sababli → bo'sh. Rang + harf (K, Kch, Y, S) — rang ko'rmaydiganlar uchun ham tushunarli.
- "Hammasi keldi" tugmasi dars ustuni uchun. Optimistik yangilash, xatoda qaytarish.
- Dars kunidan keyin belgilansa late_marked=true; avval belgilangani o'zgartirilsa edited_after=true va audit_log.
- Ustoz faqat o'z guruhlari va settings.teacher_edit_days ichida tahrirlay oladi; admin cheklovsiz (RLS + server tekshiruvi).
- Dars mavzusi va uy vazifasi maydonlari.
- "Bugungi darslar" sahifasi (/today): foydalanuvchi ko'ra oladigan bugungi darslar, har birida "Davomat qilish" tugmasi va holat (belgilangan / belgilanmagan). Mobil uchun qulay — ustoz telefondan ishlatadi.
- Talaba ketma-ket N dars kelmasa (settings.absence_threshold) — "Kelmayotganlar" ro'yxatiga tushadi (SQL view).
```

**Mezon:** ustoz akkaunti bilan telefon brauzerida 15 talabali guruhni 20 soniyada belgilay olasizmi?

---

## 5. Hisob-kitob dvigateli va to'lovlar

```
PRD §5 — eng muhim qism. Avval faqat lib/billing/ ni yoz va testla, keyin UI.
1) lib/billing/ toza funksiyalar:
   - lessonsInPeriod(group, from, to, holidays, cancelledDates)
   - chargeForPeriod({price, discount, lessonsInPeriod, lessonsInFullMonth, rounding})
   - monthlyCharge(enrollment, month, ctx) — 5.2
   - activationCharge(enrollment, date, ctx) — 5.3
   - freezeAdjustment, leaveAdjustment, holidayAdjustment — 5.5, 5.6, 5.7
   - allocatePayment(payment, openCharges) — 5.11 FIFO
   - balance(transactions), oldDebt(transactions, today) — 5.10
   PRD'dagi har qoida va misol uchun Vitest testi (680 000 × 5/13 = 261 538 misoli ham). Chegaraviy holatlar: oy boshida/oxirida faollashish, fevral, bayram muzlatish ichida, chegirma oy o'rtasida boshlanganda, yaxlitlash 1/100/1000.
   Kodni yozishdan oldin test ro'yxatini menga ko'rsat.
2) Server qismi:
   - Oylik yechish: /api/cron/monthly-charges — Vercel Cron har kuni 19:05 UTC (Toshkentda 00:05) ishlaydi, Toshkent sanasi 1-kun bo'lsa yechadi, aks holda o'tkazib yuboradi (cron'da "oyning oxirgi kuni" yozib bo'lmagani uchun). Service role, idempotency_key bilan; natija hisobotini audit_log'ga.
   - Faollashtirish, muzlatish, chiqarish, bayram amallarini 3/2-bosqichdagi joylarga ula.
   - Chegirma qo'shish formasi.
3) To'lov qabul qilish dialogi (talaba profilida va ro'yxatda): summa (MoneyInput), to'lov turi va ichki turi, sana, guruh (ixtiyoriy), izoh. Saqlangach chek ko'rinishi (58 mm print uchun CSS). To'lovni bekor qilish — sabab bilan, payments.void ruxsati.
4) Talaba profilida To'lovlar tabi: barcha tranzaksiyalar (to'lov yashil +, yechish qizil −, izohda davr va darslar soni), yuqorida balans va eski qarz.
5) Talabalar ro'yxatida Balans ustuni: manfiy bo'lsa qizil va "−" belgisi bilan (ro'yxat va profilda bir xil ko'rinish!).
6) Qarzdorlar sahifasi: summa, necha kundan beri, oxirgi to'lov, ota-ona telefoni.
```

**Mezon:** test markazida 3 oylik stsenariyni qo'lda Excel'da hisoblab, tizim bilan solishtiring — tiyin-tiyinigacha mos bo'lishi shart.

---

## 6. Bosh sahifa va hisobotlar

```
PRD §3.2, §3.8 va §6 ni amalga oshir.
- lib/metrics/ va SQL view'lar: PRD §6 dagi har ko'rsatkich bitta joyda ta'riflangan. Bosh sahifa ham, hisobotlar ham faqat shu yerdan o'qiydi. Har ta'rif uchun test (masalan: qarzdorlar soni hech qachon faol talabalardan oshmaydi).
- Bosh sahifa rolga qarab (PRD jadvali). Kartochka: raqam, o'tgan oyga nisbatan o'zgarish, bosilsa filtrlangan ro'yxat. Yuklanishda skeleton, ma'lumot yo'q bo'lsa tushuntirish.
- Hisobotlar: Moliya (oy, filiallar ustunlarda, gorizontal aylantirish o'rniga mobilda filial tanlagich), Davomat, Talabalar oqimi, Sotuv. Har birida sana oralig'i, filial filtri va Excel eksport.
- Grafiklar Recharts bilan; ranglar Tailwind tokenlaridan, qorong'i rejimda ham o'qiladigan.
```

**Mezon:** bosh sahifadagi har raqam hisobot sahifasidagi raqam bilan bir xil.

---

## 7. Xarajatlar, kassa, ish haqi

```
PRD §3.6 (xarajatlar, kassa, ish haqi) ni amalga oshir.
- Xarajatlar: ro'yxat, qo'shish, tahrirlash, o'chirish (soft delete + savat), filtrlar, turkumlar turi bilan (operating/salary/rent/marketing/tax/owner_draw). Moliya hisobotiga ula: owner_draw "foydadan olingan" qatorda.
- Kassa ("Qo'limdagi pul"): har xodim bo'yicha davr boshi, qabul qilgan (to'lov turlari bo'yicha), topshirgan, hozir bor. "Pul topshirish" dialogi. Filial kassasi tarixi.
- Ish haqi: salary_rules (4 tur), oy bo'yicha hisoblash funksiyasi lib/payroll/ (toza, testlar bilan: percent_of_revenue — ustoz guruhlaridan shu oy tushgan to'lovlar; per_lesson — o'tgan darslar soni), oyga xos o'zgartirish, bonus, jarima, berish (salary_entries + avtomatik xarajat yozuvi). Jadval: xodim, hisoblangan, bonus/jarima, berilgan, qoldiq.
- Ustoz o'z oyligi sahifasi (/my-salary): faqat o'zi ko'radi.
```

**Mezon:** ustozga 30% tushumdan oylik qo'yib, shu oy to'lovlarini kiriting — oylik avtomatik to'g'ri chiqadi.

---

## 8. Sotuv varonkasi va lidlar

```
PRD §3.7 ni amalga oshir.
- Varonkalar va bosqichlar sozlamasi (tartiblash drag-and-drop, won/lost bosqichlar).
- Kanban doska: ustunlar = bosqichlar, kartochka = lid (ism, telefon, kurs, mas'ul, kun soni bosqichda, keyingi qadam sanasi). Drag-and-drop (dnd-kit), mobilda ro'yxat ko'rinishi.
- Lid kartochkasi: tahrirlash, izohlar va faoliyat tarixi, "Talabaga aylantirish" (Talaba qo'shish paneli lid ma'lumotlari bilan ochiladi, saqlangach lead.student_id va won bosqich), "Yo'qotildi" — sabab majburiy.
- Lid manbalari: qo'lda; veb-forma — markazga xos ochiq endpoint /api/public/leads/{orgSlug} (rate limit, honeypot), sayt uchun embed HTML snippet sozlamalarda; Telegram — 9-bosqichda.
- Sotuvchi faqat o'ziga biriktirilgan yoki biriktirilmagan lidlarni ko'radi (ruxsat bilan).
```

**Mezon:** saytdagi formadan yuborilgan ariza 5 soniyada doskada paydo bo'ladi.

---

## 9. SMS va Telegram

```
PRD §3.10 va SMS sozlamalarini amalga oshir.
- Eskiz.uz: sozlamalarda login/parol (shifrlangan saqlash), token yangilash, yuborish, balans ko'rsatish; message_log'ga yozish; xato bo'lsa qayta urinish navbati.
- Avto-SMS shablonlari (o'zgaruvchilar bilan: {ism}, {summa}, {guruh}, {sana}): to'lov qabul qilindi, qarz eslatmasi (jadval bilan: har oyning N-kuni), kelmadi, tug'ilgan kun. Har birini yoqish/o'chirish.
- Telegram bot (grammY), webhook /api/telegram/[orgId] yoki bitta umumiy bot + markaz kodi — qaysi biri yaxshiroqligini taklif qil va mendan so'ra.
  a) Ustoz Mini App (/tg/attendance): Telegram initData'ni serverda HMAC bilan tekshirish; telegram_user_id → staff bog'lash (xodim profilida "Telegram ulash" kodi); bugungi darslar → talabalar (default Keldi) → saqlash; mavzu va uy vazifasi. Dars tugagach 30 daqiqada belgilanmagan bo'lsa eslatma (cron).
  b) Ota-onalar guruhi: bot guruhga qo'shilib /connect <kod> → telegram_group_links. Guruhga xabarlar: dars o'tdi (mavzu, uy vazifasi), dars bekor qilindi, imtihon natijasi. Qarz summasi va bola ismi bilan "kelmadi" hech qachon guruhga emas.
  c) Ota-ona shaxsiy: guruhdagi "Botga ulanish" deep-link → telefon raqamini ulashish (contact) → students.parent_phone bilan moslash → parent_telegram_id. Shaxsiy xabarlar: kelmadi, qarz eslatmasi, to'lov qabul qilindi. Telegram yetmasa SMS'ga qaytish (sozlama).
- Lid manbai: Telegram bot orqali ariza (ism, telefon, kurs) → lid.
```

**Mezon:** ustoz Telegram'dan davomat qiladi → ota-onalar guruhiga "Dars o'tdi" xabari, kelmagan bolaning ota-onasiga shaxsiy xabar boradi.

---

## 10. SaaS va ishga tushirish

```
PRD §3.12 va §7 ni amalga oshir.
- Tariflar jadvali (plans: nom, narx, limitlar: filiallar, faol talabalar, SMS, Telegram) va organizations.plan; limit tekshiruvi server action'larda; 80% da ogohlantirish banneri, 100% da yangi talaba qo'shish bloklanadi ("Tarifni oshirish").
- Sinov muddati tugashi: 3 kun oldin ogohlantirish, tugagach faqat o'qish rejimi.
- Super-admin paneli (/admin, profiles.is_super_admin): markazlar, holati, tarif, limitlar, oxirgi faollik, qo'lda to'lov belgilash, "markaz nomidan kirish" (audit bilan).
- O'quvchi kabineti (PRD §3.11).
- Ishlash: Lighthouse mobil > 85, asosiy bundle tahlili (@next/bundle-analyzer), og'ir komponentlarni dynamic import.
- Xavfsizlik ko'rigi: barcha jadvallarda RLS, service role faqat serverda, rate limit (auth, public endpointlar), Supabase advisors ogohlantirishlari 0.
- Zaxira: kunlik pg_dump skripti va tiklash yo'riqnomasi docs/RUNBOOK.md da.
- Hosting ko'chirish rejasi: self-hosted Supabase (Docker) O'zbekistondagi serverda — docs/MIGRATION-UZ.md da qadamlar.
```

**Mezon:** yangi markaz o'zi ro'yxatdan o'tadi, 14 kun ishlaydi, siz /admin'dan uni ko'rasiz va tarifini o'zgartirasiz.

---

## Har bosqichda foydali buyruqlar

- `Ushbu bosqich uchun avval reja yoz, kodga tegma.` — Plan mode o'rnida.
- `PRD'ga zid joy bormi? Bo'lsa, ro'yxat qil.` — bosqich oxirida.
- `Yozgan kodingni xavfsizlik nuqtai nazaridan ko'rib chiq: RLS, ruxsatlar, service role.` — 1, 5, 9-bosqichlardan keyin.
- `/review` — o'zgarishlarni ko'rib chiqish.
