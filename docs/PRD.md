# PRD — O'quv markazlari uchun CRM (SaaS)

Versiya 1.0 · 02.10.2026 · Muallif: Zafar Xasanov
Asos: Sahab ta'lim platformasi tahlili (1-bosqich hujjati).

## 1. Maqsad

O'zbekistondagi o'quv markazlariga bitta tizimda talabalar, guruhlar, davomat, pul va sotuvni boshqarish imkonini beradigan SaaS. Sahab'dan farqi: soddaroq sozlash, rolga qarab bosh sahifa, ustoz uchun Telegram orqali davomat, ota-onalar Telegram guruhiga avtomatik xabarlar, aniq va testlangan moliya qoidalari.

**MVP muvaffaqiyat mezoni:** bitta haqiqiy markaz (3+ filial, 300+ talaba) bir oy davomida faqat shu tizimda ishlaydi va oy oxirida balanslar qo'lda hisoblangan bilan 100% mos keladi.

**Hozircha qilinmaydi:** onlayn to'lov (Payme/Click/Uzum), mobil ilova, ota-ona kabineti, IP-telefoniya, kitob do'koni, landing konstruktori. Ma'lumotlar modeli onlayn to'lovni keyin ulashga tayyor bo'lishi kerak.

## 2. Foydalanuvchilar va rollar

| Rol | Kim | Asosiy ishi |
|---|---|---|
| Egasi (owner) | Markaz asoschisi | Hammasi, tarif, rollar |
| Rahbar (ceo) | Direktor | Barcha filiallar, moliya, hisobotlar |
| Menejer | Filial boshqaruvchisi | O'z filiallari: talabalar, guruhlar, moliya |
| Admin | Qabulxona | Talaba qo'shish, to'lov qabul qilish, davomat nazorati |
| Sotuvchi | Sotuv bo'limi | Lidlar va varonka |
| Ustoz | O'qituvchi | O'z guruhlari, davomat, o'z oyligi |
| Talaba | O'quvchi | Kabinet: davomat, to'lovlar, balans |
| Super-admin | Platforma egasi (siz) | Markazlar, tariflar, qo'llab-quvvatlash |

Ruxsatlar `modul.amal` ko'rinishida (`students.view`, `students.create`, `payments.create`, `payments.void`, `finance.reports`, ...). Rol = ruxsatlar to'plami. Markaz o'z rollarini yaratadi; yuqoridagi 6 ta rol shablon sifatida beriladi. To'liq ro'yxat `src/lib/permissions.ts` da, har modul uchun `view / create / update / delete` va maxsus amallar.

Xodim bir yoki bir nechta filialga biriktiriladi; "Barcha filiallar" faqat `branches.all` ruxsati borlarga.

## 3. Modullar va ekranlar (MVP)

### 3.1 Ro'yxatdan o'tish va kirish
- **Markaz ochish**: markaz nomi, egasi ismi, telefon, parol → SMS-kod bilan tasdiqlash → birinchi filial nomi → 14 kunlik sinov.
- **Kirish**: telefon + parol. Parolni tiklash SMS-kod bilan.
- Bir foydalanuvchi bir nechta markazda ishlashi mumkin → kirgach markaz tanlash.

### 3.2 Bosh sahifa (rolga qarab)
| Rol | Kartochkalar (4–6 ta) | Pastda |
|---|---|---|
| Rahbar | Bu oy tushum, Qarzdorlik jami, Faol talabalar (o'zgarish %), Sof foyda, Ketganlar (oy) | Tushum/xarajat grafigi (6 oy), filiallar taqqoslash |
| Admin | Bugungi darslar, Davomat belgilanmagan darslar, Bugun to'laganlar, Qarzdorlar soni, Sinovdagilar | Bugungi jadval, ketma-ket 3 dars kelmaganlar |
| Ustoz | Bugungi darslarim, Belgilanmagan davomat, Guruhlarimdagi talabalar | Bugungi jadval, "Davomat qilish" tugmasi |
| Sotuvchi | Yangi lidlar (bugun/hafta), Sinovga yozilganlar, Konversiya %, Menga biriktirilganlar | Varonka qisqacha |

Har kartochka bosilganda tegishli filtrlangan ro'yxat ochiladi. Ta'riflar §6 da.

### 3.3 Talabalar
- **Ro'yxat**: ism, telefon, guruhlar (kurs · ustoz · kunlar), balans (qarz qizil), eski qarz, teglar. Filtrlar: holat, guruh, kurs, ustoz, filial, qarzdor, teg, qo'shilgan sana. Qidiruv ism/telefon bo'yicha. Excel eksport. Ommaviy amallar: SMS, teg qo'shish.
- **Talaba qo'shish** (o'ng panel, istalgan sahifadan): majburiy — to'liq ism, telefon; ixtiyoriy — jins, rasm, qo'shilgan sana (default bugun), teglar; "Maydon qo'shish" — tug'ilgan sana, ota-ona ismi va telefoni, Telegram, manzil, maktab, pasport seriyasi; "Guruhga qo'shish" — bir nechta guruh, har biri uchun holat (sinov/faol) va boshlanish sanasi. Takror telefon bo'lsa ogohlantirish va mavjud talabaga o'tish havolasi.
- **Profil**: balans va eski qarz, "To'lov qabul qilish" tugmasi; tablar — Guruhlar, To'lovlar tarixi, Davomat, Izohlar, SMS tarixi, O'zgarishlar tarixi.
- **Amallar**: guruhga qo'shish, boshqa guruhga o'tkazish, muzlatish (sana oralig'i + sabab), guruhdan chiqarish (sabab), chegirma, qaytarish (refund), arxivlash.

### 3.4 Guruhlar
- Guruh: nom, filial, kurs, ustoz, xona, hafta kunlari, boshlanish/tugash vaqti, oylik narx (kursdan meros, o'zgartirish mumkin), boshlanish sanasi, holat.
- Xona va ustoz bandligi tekshiriladi (bir vaqtda ikki guruh bo'lmaydi).
- Guruh sahifasi: talabalar ro'yxati (holati, balansi), davomat jurnali (oy bo'yicha jadval), darslar ro'yxati (mavzu, uy vazifasi), ota-onalar Telegram guruhi ulanishi.
- Darslar jadvaldan avtomatik yaratiladi (oldindan 60 kun), bayram kunlari bekor qilingan holda.

### 3.5 Davomat
- Jurnal: qatorlar — talabalar, ustunlar — darslar. Katakni bosish: Keldi → Kechikdi → Kelmadi → Sababli → bo'sh.
- Default "hammasi keldi" tugmasi, keyin faqat istisnolarni bosish.
- Dars kunidan keyin belgilangan yoki tahrirlangan belgi `late_marked` deb belgilanadi va hisobotda ko'rinadi. Ustoz o'tgan darsni N kundan keyin tahrirlay olmaydi (sozlama, default 2 kun); admin oladi.
- Kelmagan talaba ota-onasiga xabar (Telegram shaxsiy yoki SMS, sozlamaga qarab).

### 3.6 Moliya
- **To'lov qabul qilish**: talaba, summa, to'lov turi (Naqd, Karta → ichki turlar, Terminal, Bank o'tkazmasi), sana, izoh; qaysi guruh uchun (ixtiyoriy). Chek (PDF/print) va SMS "To'lov qabul qilindi".
- **Tushumlar** ro'yxati: filtrlar (sana, turi, guruh, ustoz, qabul qilgan xodim), jami turlar bo'yicha.
- **Xarajatlar**: sana, summa, turkum, to'lov turi, oluvchi, izoh. Turkumlarning **turi** bor: operatsion, ish haqi, ijara, marketing, soliq, egasiga olingan (foydadan). Bu moliya hisobotini to'g'ri qiladi.
- **Kassa** ("Qo'limdagi pul"): har xodim qabul qilgan naqd/karta pullar minus topshirgani. "Topshirish" amali: xodim → rahbar yoki filial kassasi.
- **Ish haqi**: ustoz va xodim uchun kelishuv turi — qat'iy oylik; guruh uchun qat'iy; tushumdan foiz; dars uchun. Oyga xos o'zgartirish, bonus, jarima. Oy yakunida "hisoblangan / berilgan / qoldiq". Ustoz o'z oyligini ko'radi.
- **Qarzdorlar**: ro'yxat, qarz summasi va muddati (necha kun), oxirgi to'lov, ota-ona telefoni; ommaviy eslatma yuborish.

### 3.7 Sotuv bo'limi
- Bir nechta varonka; har biri bosqichlar (Kanban). Default: Yangi lid → Bog'lanildi → Sinovga yozildi → Sinovga keldi → Talaba bo'ldi / Yo'qotildi.
- Lid: ism, telefon, manba, qiziqqan kurs, filial, mas'ul, izohlar, keyingi qadam sanasi.
- "Talabaga aylantirish" — lid ma'lumotlari bilan Talaba qo'shish paneli ochiladi.
- Lid manbalari (MVP): qo'lda, veb-forma (embed kod / API), Telegram bot. Keyin: Facebook Lead Ads.
- Yo'qotish sababi majburiy.

### 3.8 Hisobotlar
- **Moliya**: oy bo'yicha, filiallar kesimida — tushum, xarajatlar turkumlar bo'yicha, sof foyda (tushum − operatsion xarajatlar), foydadan olingan, ortgan pul; o'rtacha chek, to'lagan talabalar.
- **Davomat**: belgilangan % , keldi/kechikdi/kelmadi/sababli, kechikib belgilangan, guruhlar va ustozlar kesimida, ko'p qoldirganlar.
- **Talabalar oqimi**: yangi, faollashgan, muzlatilgan, chiqqan (sabablar bo'yicha), qaytgan.
- **Sotuv**: bosqichlar bo'yicha konversiya, manbalar, sotuvchilar.
- Hammasi Excel'ga eksport.

### 3.9 Sozlamalar
Markaz (nom, logo, rang, ish vaqti), filiallar, xodimlar va rollar, kurslar, xonalar, to'lov turlari, xarajat turkumlari, sabablar (chiqish, muzlatish, qaytarish, lid yo'qotish), teglar, bayramlar (darslarni ommaviy bekor qilish), o'quv qoidalari (sinov darslari soni, kelmaslik chegarasi, ustoz tahrirlash muddati), hisob-kitob qoidalari (§5), SMS (Eskiz ulanishi, avto-SMS shablonlari), Telegram (bot, guruhlar ulanishi), tarif va to'lov (SaaS).

### 3.10 Telegram
- **Ustoz Mini App**: bot tugmasi → Telegram `initData` orqali kirish (Telegram ID xodimga bog'langan) → bugungi darslar → talabalar ro'yxati (default "keldi") → istisnolarni belgilash → Saqlash. Mavzu va uy vazifasi maydoni. Dars tugagach 30 daqiqada belgilanmagan bo'lsa eslatma.
- **Ota-onalar guruhlari**: bot guruhga admin qilib qo'shiladi, `/connect <kod>` bilan o'quv guruhiga bog'lanadi. Guruhga: dars o'tdi + mavzu + uy vazifasi, dars bekor qilindi, imtihon natijasi (umumiy). Shaxsiy (botni ishga tushirgan ota-onaga): farzandi kelmadi, qarz eslatmasi, to'lov qabul qilindi. Qarz summasi hech qachon guruhga yozilmaydi.

### 3.11 O'quvchi kabineti
Veb (mobilga moslashgan): guruhlar va jadval, davomat, to'lovlar tarixi va balans, materiallar. Kirish: telefon + parol (admin o'rnatadi) yoki SMS-kod.

### 3.12 SaaS boshqaruvi (super-admin)
Markazlar ro'yxati, holati (sinov/faol/to'xtatilgan), tarif, limitlar (filiallar, faol talabalar), oxirgi faollik, "markaz nomidan kirish" (audit bilan). Tariflar: Start / Standart / Pro — narxlar keyin belgilanadi. Limit oshsa yumshoq ogohlantirish, keyin yangi talaba qo'shish bloklanadi.

## 4. Ma'lumotlar modeli
`docs/schema.sql` ga qarang. Markaziy g'oya: **Talaba × Guruh = Enrollment (a'zolik)**; holat, chegirma, hisobdan yechishlar a'zolikka bog'lanadi. Balans tranzaksiyalardan hisoblanadi.

## 5. Hisob-kitob qoidalari (eng muhim qism)

Barcha qoidalar `lib/billing/` da toza funksiyalar sifatida, har biri testlar bilan.

**5.1 Darslar soni.** `lessons_in_month(group, month)` = guruh hafta kunlariga to'g'ri keladigan oydagi sanalar soni, bayramlar (filial yoki butun markaz) va bekor qilingan darslar ayirilgan holda.

**5.2 Oylik yechish.** Har oy 1-sanasi soat 00:05 (Asia/Tashkent) da har bir `active` a'zolik uchun:
`summa = round(narx_chegirmadan_keyin × darslar_davrda / darslar_to'liq_oyda)`.
To'liq oy uchun summa = narx. `idempotency_key = charge:{enrollment_id}:{YYYY-MM}`.

**5.3 Oy o'rtasida faollashtirish.** Faollashgan sanadan oy oxirigacha bo'lgan darslar uchun 5.2 formulasi bo'yicha darhol yechiladi.
Misol: narx 680 000, oyda 13 dars, faollashganda 5 dars qolgan → 680 000 × 5/13 = 261 538 so'm.

**5.4 Sinov.** `trial` holatidagi darslar uchun yechilmaydi. Sinov darslari soni sozlamada (default 2). Sinov tugab faollashtirilmasa, a'zolik "Sinov muddati o'tdi" ro'yxatiga tushadi.

**5.5 Muzlatish.** Muzlatilgan oraliqdagi darslar uchun pul olinmaydi. Agar bu oy uchun allaqachon yechilgan bo'lsa — shu darslar ulushi `adjustment` (musbat) sifatida qaytariladi.

**5.6 Chiqarish.** Chiqqan sanadan keyingi shu oydagi darslar ulushi qaytariladi (sozlama: qaytarilsin / qaytarilmasin; default qaytarilsin).

**5.7 Bayram.** Bayram e'lon qilinsa, o'sha kundagi darslar bekor qilinadi; agar oy uchun yechilgan bo'lsa, har bekor dars uchun `narx / darslar_to'liq_oyda` qaytariladi.

**5.8 Chegirma.** Foiz yoki qat'iy summa, amal qilish oralig'i bilan, a'zolikka biriktiriladi; yechish vaqtida qo'llanadi va tranzaksiya izohida ko'rsatiladi.

**5.9 Yaxlitlash.** Sozlama: 1 so'mgacha (default), 100 yoki 1 000 so'mgacha. Yaxlitlash har yechishda alohida.

**5.10 Balans.** `balans = Σ amount` (to'lov va qaytarishlar +, yechishlar −). `eski_qarz = min(0, balans + joriy_oy_yechishlari)` — joriy oy yechishlarisiz qolgan qarz. Talabaning umumiy balansi barcha a'zoliklari yig'indisi.

**5.11 To'lovni taqsimlash.** To'lov ma'lum guruhga ko'rsatilsa — o'sha a'zolikka; ko'rsatilmasa — eng eski qarzi bor a'zolikka (FIFO), ortiqchasi umumiy balansda qoladi.

**5.12 Bekor qilish.** To'lovni o'chirib bo'lmaydi; "Bekor qilish" teskari tranzaksiya yaratadi, sabab majburiy, `payments.void` ruxsati kerak.

## 6. Ko'rsatkichlar ta'riflari (hamma joyda bir xil)

| Ko'rsatkich | Ta'rif |
|---|---|
| Faol talaba | Kamida bitta `active` a'zoligi bor talaba |
| Qarzdor | Faol talaba, umumiy balansi < 0 |
| Sinovdagi | Kamida bitta `trial` a'zolik, `active` yo'q |
| Muzlatilgan | `frozen` a'zoligi bor, `active` yo'q |
| Ketgan (davr) | Davr ichida oxirgi faol a'zoligi `left` bo'lgan |
| Tushum (davr) | Davrdagi `payment` tranzaksiyalar yig'indisi (bekor qilinganlarsiz) |
| Sof foyda | Tushum − operatsion xarajatlar (foydadan olinganlar kirmaydi) |
| Ortgan pul | Sof foyda − foydadan olingan xarajatlar |
| O'rtacha chek | Tushum / to'lov qilgan talabalar soni |
| Davomat belgilangan % | Belgilangan kataklar / o'tgan darslardagi jami kataklar |
| Qatnashish % | (Keldi + Kechikdi) / belgilangan kataklar |
| Konversiya (sotuv) | Talabaga aylangan lidlar / davrda kelgan lidlar |

Bu ta'riflar `lib/metrics/` da bitta joyda va SQL view'larda amalga oshiriladi; bosh sahifa va hisobotlar shu bitta manbadan o'qiydi.

## 7. Nofunksional talablar
- Sahifa ochilishi < 2 s (4G), asosiy JS < 300 KB (gzip).
- Mobil kenglikda (375 px) barcha asosiy sahifalar ishlaydi.
- Kunlik zaxira nusxa; pul va davomat o'zgarishlari audit_log'da.
- Ma'lumotlar xavfsizligi: RLS, har so'rov `organization_id` bilan; parol va kalitlar `.env` da.
- O'zbekiston qonunchiligi: fuqarolarning shaxsiy ma'lumotlari O'zbekiston hududidagi serverlarda saqlanishi talab qilinadi — tijoriy sotuvdan oldin yurist bilan tekshirish va hostingni ko'chirish rejasi kerak (ROADMAP 10-bosqich).

## 8. Ochiq savollar
1. Kelmagan talabalar ismi ota-onalar guruhiga yozilsinmi yoki faqat shaxsan?
2. SaaS tarif narxlari va limitlar.
3. Ustoz ish haqi turlaridan qaysilari MVP'da shart?
4. Chek printeri (termal 58/80 mm) kerakmi?
