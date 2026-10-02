# Tizim qanday ishlaydi — qoidalar

Bu fayl — markaz egasi uchun: tizimdagi har bir biznes qoida oddiy tilda.
Har bosqich tugaganda yangilanadi. Texnik tafsilotlar: `docs/PRD.md`, `docs/ROADMAP.md`, `README.md`.

Holatlar:
- ✅ **Amalda** — tasdiqlangan va saytda ishlaydi.
- 📝 **Taklif** — hali tasdiqlanmagan, ishlab chiqilmagan.

---

## Umumiy (✅)

- **Pul** butun so'mda saqlanadi, tiyin yo'q. Ko'rinishi: `1 250 000 so'm`.
- **Balans** hech qayerda alohida yozilmaydi — har safar to'lov va yechishlar yig'indisidan hisoblanadi. Shuning uchun balans "adashib" qolmaydi.
- **To'lov o'chirilmaydi**, faqat bekor qilinadi (teskari yozuv bilan) — tarix doim saqlanadi.
- **Sana** doim `KK.OO.YYYY` (02.10.2026), vaqt `HH:mm` (24 soat), vaqt zonasi — Toshkent.
- **Telefon** `+998 XX XXX XX XX`. Har qanday operator kodi qabul qilinadi (yangi operatorlar uchun).
- **O'zgarishlar tarixi** (audit): pul, davomat tahriri, rol o'zgarishi, o'chirish va talaba ma'lumotlari — kim, qachon, nimani o'zgartirgani yoziladi.
- **Ruxsatlar** ikki joyda tekshiriladi: serverda va bazada. Tugmani yashirish — faqat qulaylik; ruxsati yo'q odam to'g'ridan-to'g'ri so'rov yuborsa ham baza rad etadi.
- **Markazlar bir-birini ko'rmaydi.** Har yozuv markazga bog'langan.

## Rollar (✅)

| Rol | Nima qila oladi |
|---|---|
| Egasi | Hammasi; egasi rolini o'zgartirib bo'lmaydi |
| Rahbar | Barcha filiallar, moliya, hisobotlar |
| Menejer | O'z filiallari: talabalar, guruhlar, davomat, moliya |
| Admin | Qabulxona: talaba qo'shish, to'lov, davomat |
| Sotuvchi | Lidlar va sotuv |
| Ustoz | O'z guruhlari va ularning davomati |

- Rollarni Sozlamalar → Rollar'da o'zgartirish mumkin. O'zingizda yo'q ruxsatni boshqaga bera olmaysiz.
- Yangi xodimga vaqtinchalik parol beriladi, birinchi kirishda u o'z parolini o'rnatadi.
- Nofaol xodim tizimga kira olmaydi.

## Guruhlar va darslar (✅ 2-bosqich)

- Guruh kursga bog'lanadi; narx va dars davomiyligi kursdan olinadi (o'zgartirsa bo'ladi).
- **Darslar avtomatik** yaratiladi: guruh jadvali bo'yicha bugundan 60 kun oldinga. Har kecha (00:00 Toshkent) yangilanadi.
- **To'qnashuv**: bir xonada yoki bitta ustozda bir vaqtda ikki guruh bo'lsa — saqlanmaydi.
- **Bayram** (butun markaz yoki bitta filial) e'lon qilinsa, o'sha kundagi darslar bekor qilinadi. Bayram o'chirilsa — darslar qaytadi.
- Davomati bor yoki o'tib ketgan dars hech qachon avtomatik o'chirilmaydi.
- Guruh "tugagan" qilinsa: kelajakdagi darslar olib tashlanadi, xona va ustoz bo'shaydi.

## Talabalar va a'zoliklar (✅ 3-bosqich)

**Talaba holati** (ro'yxatda):

| Holat | Qachon |
|---|---|
| Faol | Kamida bitta guruhda "Faol" |
| Sinovda | Faol guruhi yo'q, kamida bittasida sinovda |
| Muzlatilgan | Faol guruhi yo'q, kamida bittasida muzlatilgan |
| Chiqqan | Hamma guruhlardan chiqqan |
| Guruhsiz | Hech qaysi guruhga yozilmagan |
| Arxivlangan | Arxivga olingan (ro'yxatda ko'rinmaydi, ma'lumot saqlanadi) |

**Guruhdagi o'rni (a'zolik) amallari:**
- **Guruhga qo'shish** — holati "Sinovda" yoki "Faol", boshlanish sanasi bilan. Talabani boshqa filialning (sizga ko'rinadigan) guruhiga ham qo'shish mumkin.
- **Faollashtirish** — sinovdagi talabani "Faol" qiladi. Sana guruhga qo'shilgan sanadan oldin bo'lmaydi.
- **Muzlatish** — sana oralig'i va (ixtiyoriy) sabab.
  - Bugundan boshlansa — darhol "Muzlatilgan".
  - Kelajakdan boshlansa — o'sha kungacha "Faol" qoladi, keyin har kecha avtomatik "Muzlatilgan" bo'ladi va tugagach yana "Faol".
  - Bir a'zolikda muzlatishlar kesishmaydi.
  - **Muzlatishni tugatish**: boshlanmagan bo'lsa — bekor qilinadi; boshlangan bo'lsa — kecha bilan tugaydi.
- **Guruhdan chiqarish** — sana va **sabab majburiy**. Sana guruhga qo'shilgan kundan oldin bo'lmaydi. Holat darhol "Chiqqan".
- **Boshqa guruhga o'tkazish** — eski guruhdan yangi guruhdagi boshlanish kunidan bir kun oldin chiqadi. Sinovdagi talaba sinovda qoladi, qolganlari "Faol".
- **Arxivlash** — faqat hamma guruhlardan chiqqan talabani.
- **Takror telefon** — shu raqamli talaba bo'lsa ogohlantiradi, lekin baribir saqlash mumkin.
- Har bir amal talabaning "O'zgarishlar tarixi"da ko'rinadi.

## Davomat (✅ 4-bosqich)

- Belgilar: **K** — Keldi, **Kch** — Kechikdi, **Y** — Kelmadi, **S** — Sababli.
- Faqat **bugungi va o'tgan** darslar belgilanadi; kelajakdagi va bekor qilingan darslar — yo'q.
- Jurnalda talaba faqat guruhda bo'lgan kunlarda ko'rinadi. **Muzlatilgan kunlar** qulflangan (❄), belgilab bo'lmaydi.
- **Ustoz** faqat o'z guruhini belgilaydi va faqat dars kunidan keyin **N kun** ichida (Sozlamalar → Markaz, default 2). Muddat o'tgach na yangi belgi, na tahrir. **Admin** (davomat boshqaruvi ruxsati) cheklovsiz.
- Dars kuni ichida belgini xohlagancha o'zgartirish mumkin. **Dars kunidan keyin** qo'yilgan belgi "kechikib belgilangan", o'zgartirilgani "keyin tahrirlangan" deb belgilanadi va o'zgarishlar tarixiga yoziladi.
- Davomat belgilangan dars "O'tdi" holatiga o'tadi.
- **Kelmayotganlar** — ketma-ket **N dars** "Kelmadi" (Sozlamalar → Markaz, default 3):
  - "Keldi" yoki "Kechikdi" hisobni nolga tushiradi;
  - "Sababli" va belgilanmagan darslar hisobga olinmaydi (na oshiradi, na buzadi);
  - faqat faol va sinovdagi talabalar ko'rinadi.
- Davomat pulga ta'sir qilmaydi (hisob-kitob darslar jadvalidan, PRD §5): talaba kelmasa ham dars puli olinadi.

## Hisob-kitob va to'lovlar (✅ 5-bosqich)

**Asosiy formula** (PRD §5.2): `summa = narx × davrdagi_darslar / oydagi_darslar`, har yozuv alohida yaxlitlanadi (Sozlamalar → Markaz → Moliya: 1, 100 yoki 1 000 so'mgacha).

- **Oydagi darslar** — guruh kunlari bo'yicha oyning **hamma** kunlari, bayram va bekor qilingan darslarsiz. Guruh oy o'rtasida ochilsa ham shunday (A): birinchi oy faqat ochilgandan keyingi darslar ulushi to'lanadi.
- **Oylik yechish** — har oyning 1-kuni 00:00 da (Toshkent) "Faol" va "Muzlatilgan" a'zoliklar uchun (B). Oldindan ma'lum muzlatish kunlari yechilmaydi.
- **Oy o'rtasida faollashtirish** — faollashgan kundan oy oxirigacha bo'lgan darslar darhol yechiladi. Misol: 680 000 × 5/13 = 261 538 so'm. O'tgan sana bilan faollashtirilsa — o'tgan oylar ham hisoblanadi.
- **Sinovda** — pul olinmaydi. Sinov darslari soni sozlamada (default 2); shuncha dars o'tib faollashtirilmagan talaba ro'yxatdagi **"Sinov muddati o'tdi"** filtrida ko'rinadi.
- **Muzlatish** — muzlatilgan kunlar uchun pul olinmaydi; oy allaqachon yechilgan bo'lsa, o'sha darslar ulushi qaytariladi. Muzlatish oldinroq tugatilsa yoki bekor qilinsa, ortiqcha qaytarilgan pul qayta yechiladi (D).
- **Guruhdan chiqish** — chiqqan kundan keyingi darslar ulushi qaytariladi (chiqish kunidagi dars qaytarilmaydi). Sozlamada o'chirib qo'yish mumkin.
- **Bayram** — oy yechilgan bo'lsa, har bekor dars uchun talaba to'lagan (chegirmali) narx ulushi qaytariladi (F). Bayram o'chirilsa — qayta yechiladi.
- **Chegirma** (foiz yoki summa, sana oralig'i bilan) — faqat chegirma amal qilgan kunlardagi darslar arzon (C). Allaqachon yechilgan darslar uchun farq qaytariladi. Bir guruhda chegirmalar kesishmaydi.
- **Bir hodisa ikki marta hisoblanmaydi**: har yozuvning kaliti bor (`charge:{a'zolik}:{oy}`), tungi tekshiruv qayta ishlasa ham pul ikki marta yechilmaydi. Tungi cron har kecha joriy oyni tekshiradi — biror hodisa o'tkazib yuborilgan bo'lsa ham to'g'rilaydi.

**To'lovlar:**
- To'lov turi (Naqd, Karta → Uzcard/Humo, Terminal, Bank), sana (kelajak emas, 1 yildan eski emas), izoh, ixtiyoriy guruh.
- **Guruh ko'rsatilmasa** — pul avval eng eski qarzga, keyin keyingisiga; ortig'i umumiy balansda qoladi (E). Chekda bitta to'lov bo'lib ko'rinadi.
- Har to'lovga **chek raqami** (markaz bo'yicha 1, 2, 3, ...) va 58 mm printer uchun chek.
- **To'lov o'chirilmaydi** — "Bekor qilish" teskari yozuv yaratadi, sabab majburiy, faqat `payments.void` ruxsati bilan (Egasi, Rahbar, Menejer; Admin'da yo'q). Chekda "BEKOR QILINGAN" chiqadi.
- Ikki marta bosilsa ham bitta to'lov yoziladi.

**Balans va qarz:**
- **Balans** = barcha to'lovlar − barcha yechishlar (+ qaytarishlar). Manfiy — qarz (qizil, "−").
- **Eski qarz** = joriy oy hisobisiz qolgan qarz.
- **Qarzdor** — faol talaba, umumiy balansi manfiy. Moliya → Qarzdorlar: qarz, eski qarz, necha kundan beri, oxirgi to'lov, ota-ona telefoni.
- Hisob-kitobning qo'lda tekshiruvi: [`docs/hisob-kitob-stsenariy.xlsx`](hisob-kitob-stsenariy.xlsx) — 3 oylik misol formulalar bilan, tizim natijasi bilan tiyin-tiyinigacha mos.

**Keyinroq:** talabaga naqd pul qaytarib berish (H) — keyingi bosqichlardan birida.
