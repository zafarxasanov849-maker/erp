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
- Davomat pulga ta'sir qilmaydi (hisob-kitob darslar jadvalidan, PRD §5).

## Hisob-kitob va to'lovlar (📝 5-bosqich — taklif, tasdiqlanmagan)

PRD §5 dagi qoidalar o'zgarishsiz amal qiladi:
- **Oylik yechish** har oy 1-kuni: `narx × davrdagi_darslar / oydagi_darslar`.
- **Oy o'rtasida faollashsa** — qolgan darslar ulushi darhol yechiladi (680 000 × 5/13 = 261 538).
- **Sinovdagi** darslar uchun pul olinmaydi.
- **Muzlatilgan, bayram** kunlari uchun pul olinmaydi yoki qaytariladi.
- **Chiqqandan keyingi** darslar ulushi qaytariladi (sozlamaga qarab).
- **Yaxlitlash** har yechishda alohida.
- **Eski qarz** — joriy oy yechishlarisiz qolgan qarz.

PRD'da aniq yozilmagan joylar bo'yicha takliflar:

| | Savol | Taklif |
|---|---|---|
| A | Guruh oy o'rtasida ochilsa | Talaba birinchi oy faqat qatnashgan darslari ulushini to'laydi |
| B | Muzlatilgan talaba | Muzlatilmagan kunlari uchun to'laydi, muzlatilgan kunlari uchun yo'q |
| C | Chegirma oy o'rtasida boshlansa | Faqat chegirma boshlangan kundan keyingi darslar arzon |
| D | Muzlatish oldinroq tugatilsa | Ortiqcha qaytarilgan pul qayta yechiladi (bayram o'chirilsa ham) |
| E | Guruh ko'rsatilmagan to'lov | Avval eng eski qarzga, keyin keyingisiga; ortig'i balansda |
| F | Bayram qaytarishi | Talaba to'lagan (chegirmali) narxdan |
| G | Pul yechishni kim yozadi | Serverdagi bitta maxsus fayl (CLAUDE.md'ga bitta istisno) |
| H | Talabaga naqd pul qaytarish | Shu bosqichda, sabab va to'lov turi bilan |
