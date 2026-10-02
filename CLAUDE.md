# CLAUDE.md — O'quv markazlari uchun CRM (SaaS)

Bu fayl Claude Code uchun loyiha qoidalari. Har sessiya boshida o'qiladi. Batafsil talablar: `docs/PRD.md`, baza: `docs/schema.sql`, bosqichlar: `docs/ROADMAP.md`.

## Mahsulot

O'zbekistondagi o'quv markazlari uchun ko'p ijarachili (multi-tenant) SaaS CRM/ERP: talabalar, guruhlar, davomat, avtomatik oylik hisob-kitob, to'lovlar, qarzdorlar, xarajatlar, ish haqi, sotuv varonkasi, hisobotlar. Har bir markaz (organization) o'zi ro'yxatdan o'tadi, bir nechta filialga ega bo'ladi.

Interfeys tili: o'zbek (lotin) asosiy, rus ikkinchi. Kod, jadval va o'zgaruvchi nomlari: ingliz tilida.

## Stek (o'zgartirmang, avval so'rang)

- **Next.js 15** (App Router, Server Components, Server Actions), **TypeScript strict**
- **Supabase**: Postgres 15+, Auth, Storage, Row Level Security, `pg_cron`, Edge Functions
- **UI**: Tailwind CSS + shadcn/ui, ikonlar `lucide-react`
- **Jadvallar**: TanStack Table; **grafiklar**: Recharts
- **Formalar**: react-hook-form + zod (bitta zod sxema ham klientda, ham serverda)
- **i18n**: next-intl (`uz`, `ru`)
- **Sana**: date-fns + date-fns-tz, vaqt zonasi doim `Asia/Tashkent`
- **Excel**: exceljs (serverda)
- **Telegram bot**: grammY (Supabase Edge Function yoki alohida Node servis)
- **SMS**: Eskiz.uz API
- **Testlar**: Vitest (biznes-mantiq), Playwright (asosiy yo'llar)
- **Hosting**: Vercel + Supabase. Ma'lumotlar keyinchalik O'zbekistondagi serverga (self-hosted Supabase) ko'chirilishi kerak, shuning uchun Supabase'ga xos bo'lmagan oddiy Postgres imkoniyatlaridan foydalaning.

## Papkalar tuzilishi

```
src/
  app/
    (auth)/            login, register, reset
    (app)/[branchId]/  ichki sahifalar: dashboard, students, groups, ...
    (student)/         o'quvchi kabineti
    api/               cron, webhook (telegram, eskiz)
  components/ui/       shadcn komponentlari
  components/          umumiy komponentlar (DataTable, MoneyInput, PhoneInput, ...)
  features/<modul>/    har modul: actions.ts, queries.ts, schema.ts (zod), components/
  lib/
    billing/           hisob-kitob mantig'i — SOF funksiyalar, testlar bilan
    permissions.ts     ruxsatlar ro'yxati va tekshiruvi
    money.ts, dates.ts, phone.ts
supabase/
  migrations/          SQL migratsiyalar (docs/schema.sql dan boshlanadi)
  functions/           edge functions
```

## Qat'iy qoidalar

1. **Har jadvalda `organization_id`** va RLS yoqilgan bo'ladi. Hech qachon RLS'ni o'chirmang yoki `service_role` kalitini klientga bermang. Service role faqat cron va webhook'larda.
2. **Ruxsat tekshiruvi ikki joyda**: Server Action ichida (`requirePermission('students.create')`) va RLS'da (`has_permission()`). UI'da tugmani yashirish — faqat qulaylik, himoya emas.
3. **Pul** — `bigint`, butun so'mda. Hech qachon `float` emas. Ko'rsatishda `1 250 000 so'm` (bo'shliq bilan). Manfiy balans = qarz.
4. **Balans hech qachon saqlanmaydi** — har doim `transactions` yig'indisidan hisoblanadi (view yoki funksiya). Tranzaksiya o'chirilmaydi, faqat `voided_at` bilan bekor qilinadi va teskari yozuv qilinadi.
5. **Hisob-kitob mantig'i** (`lib/billing/`) toza funksiyalar: kirish — guruh jadvali, bayramlar, sanalar, narx; chiqish — summa va darslar soni. Har qoida uchun Vitest testi bo'lishi shart. `docs/PRD.md` §5 dagi qoidalarni aynan bajaring.
6. **Idempotentlik**: avtomatik yechishlar `idempotency_key` bilan (`charge:{enrollment_id}:{YYYY-MM}`). Cron ikki marta ishlasa ham ikki marta yechilmasin.
7. **Sana formati** UI'da doim `KK.OO.YYYY` (02.10.2026), vaqt `HH:mm`. Bazada `date` va `timestamptz`.
8. **Telefon** `+998XXXXXXXXX` formatida saqlanadi; operator kodlari tekshiriladi (`lib/phone.ts`). Bir markazda bir xil telefonli talaba qo'shilsa, ogohlantirish chiqadi.
9. **Har o'zgarish audit_log'ga** yoziladi (pul, davomat tahriri, rol o'zgarishi, o'chirish).
10. **Bo'sh holatlar**: har jadval va grafikda ma'lumot yo'q bo'lsa, nima uchun bo'shligini va nima qilish kerakligini yozing. Yuklanishda `0` emas, skeleton ko'rsating.
11. **Tarif cheklovi** va **ruxsat yo'qligi** turli xabar bilan ko'rsatiladi: "Bu funksiya Pro tarifida" va "Sizda bu bo'limga ruxsat yo'q".

## Atamalar (UI'da aynan shunday yozing)

| Kod | UI (uz) |
|---|---|
| organization | Markaz |
| branch | Filial |
| student | Talaba |
| enrollment | Guruhdagi o'rni (a'zolik) |
| group | Guruh |
| lesson | Dars |
| attendance: present / late / absent / excused | Keldi / Kechikdi / Kelmadi / Sababli |
| enrollment status: trial / active / frozen / left | Sinovda / Faol / Muzlatilgan / Chiqqan |
| charge | Hisobdan yechish |
| payment | To'lov |
| debtor | Qarzdor |
| lead | Lid |
| pipeline / stage | Varonka / Bosqich |

## Ish tartibi

- Har bosqichni `docs/ROADMAP.md` bo'yicha alohida bajaring. Katta o'zgarishdan oldin reja yozing va tasdiq kuting.
- Migratsiya qo'shsangiz: `supabase/migrations/<timestamp>_<nom>.sql`, keyin `supabase gen types typescript` bilan turlarni yangilang.
- Har bosqich oxirida: `pnpm lint && pnpm typecheck && pnpm test` o'tishi shart.
- Commit xabarlari: `feat(students): ...`, `fix(billing): ...`.
- Tushunarsiz biznes qoida bo'lsa — taxmin qilmang, so'rang.

## Buyruqlar

```
pnpm dev            # lokal server
pnpm test           # vitest
pnpm e2e            # playwright
pnpm typecheck
supabase start      # lokal Supabase (Docker)
supabase db reset   # migratsiyalar + seed
```
