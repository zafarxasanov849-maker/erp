# EduCRM — o'quv markazlari uchun CRM (SaaS)

Ko'p ijarachili CRM/ERP: talabalar, guruhlar, davomat, oylik hisob-kitob, to'lovlar, sotuv varonkasi, hisobotlar.

- Talablar: [`docs/PRD.md`](docs/PRD.md)
- Ma'lumotlar bazasi: [`docs/schema.sql`](docs/schema.sql) → `supabase/migrations/`
- Bosqichlar: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Claude Code qoidalari: [`CLAUDE.md`](CLAUDE.md)

## Stek

Next.js 15 (App Router) · TypeScript strict · Supabase (Postgres, Auth, RLS) · Tailwind CSS v4 + shadcn/ui · next-intl (uz, ru) · date-fns-tz (Asia/Tashkent) · Vitest · Playwright

## Talablar

- Node.js 20.11+ (22 tavsiya etiladi)
- pnpm 10 (`corepack enable`)
- Docker (lokal Supabase uchun)
- Supabase CLI: `brew install supabase/tap/supabase` yoki `npx supabase ...`

## Ishga tushirish

```bash
pnpm install
cp .env.example .env.local

supabase start          # lokal Supabase (Docker). Chiqqan "anon key" va "service_role key" ni .env.local ga yozing
supabase db reset       # migratsiyalarni qo'llash
pnpm db:types           # src/lib/supabase/database.types.ts ni yangilash

pnpm dev                # http://localhost:3000
```

`.env.local` dagi `SEND_SMS_HOOK_SECRET` — `supabase/config.toml` dagi `[auth.hook.send_sms] secrets` qiymati bilan bir xil bo'lsin.

### Auth va SMS

- Kirish: telefon + parol (Supabase Auth, telefon provayderi). Ro'yxatdan o'tish va parolni tiklash SMS-kod bilan.
- SMS'ni Supabase emas, ilova yuboradi: Supabase Auth **Send SMS hook** → `POST /api/auth/sms-hook` (Standard Webhooks imzosi tekshiriladi) → `src/lib/sms.ts`.
- Lokal ishlab chiqishda SMS yuborilmaydi: kod `pnpm dev` konsoliga chiqadi (`[sms:dev] +998...: ... kodi 123456`) va `GET /api/dev/sms?phone=%2B998...` orqali ko'rinadi. Eskiz.uz 9-bosqichda ulanadi; ungacha production'da SMS yuborib bo'lmaydi.
- Lokal Supabase hook'ni `http://host.docker.internal:3000` ga yuboradi — dev server **3000** portida bo'lishi kerak.
- `supabase/config.toml` dagi `[auth.sms.twilio]` — soxta qiymatlar: CLI telefon kirishini faqat provayder yoqilgan bo'lsa ishga tushiradi, haqiqatda hook ishlatiladi.

## Buyruqlar

| Buyruq                              | Vazifasi                                             |
| ----------------------------------- | ---------------------------------------------------- |
| `pnpm dev`                          | lokal server                                         |
| `pnpm build` / `pnpm start`         | production build va ishga tushirish                  |
| `pnpm lint`                         | ESLint                                               |
| `pnpm format` / `pnpm format:check` | Prettier                                             |
| `pnpm typecheck`                    | TypeScript                                           |
| `pnpm test`                         | Vitest (biznes-mantiq)                               |
| `pnpm e2e`                          | Playwright (desktop + 375 px mobil)                  |
| `supabase test db`                  | pgTAP: RLS va markazlar izolyatsiyasi                |
| `pnpm db:types`                     | Supabase'dan TypeScript turlarini generatsiya qilish |

Har bosqich oxirida: `pnpm lint && pnpm typecheck && pnpm test`.

E2E testlar haqiqiy lokal Supabase bilan ishlaydi (`supabase start` kerak): har test yangi markaz ochadi, SMS kodlarini dev inbox'dan o'qiydi. Playwright brauzeri: `pnpm exec playwright install chromium`. Boshqa versiyadagi Chromium'dan foydalanish uchun: `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome pnpm e2e`.

## Tuzilma

```
messages/               uz.json, ru.json — barcha UI matnlari
src/
  app/(app)/[branchId]/ ichki sahifalar; [branchId] = filial uuid yoki "all"
  components/ui/        shadcn komponentlari
  app/(auth)/           login, register, verify, reset
  app/(account)/        onboarding (markaz ochish), select-org, change-password
  app/api/auth/sms-hook Supabase Auth → SMS
  components/           umumiy komponentlar (EmptyState, PhoneInput, NoAccess, PlanLimit, ...)
  features/<modul>/     actions.ts, queries.ts, schema.ts (zod), components/
                        auth, shell, settings, organization, branches, roles, staff
  i18n/                 next-intl sozlamalari (til cookie'da, URL'da emas)
  lib/
    auth.ts             getOrgContext(), requirePermission(), requirePagePermission()
    permissions.ts      ruxsatlar ro'yxati va tizim rollari (yagona manba)
    action.ts           Server Action natijasi, xatolar, unwrap()
    money.ts            formatMoney → "1 250 000 so'm"
    dates.ts            KK.OO.YYYY, HH:mm, Asia/Tashkent
    phone.ts            +998XXXXXXXXX normalizatsiya (har qanday 9 raqamli kod)
    supabase/           server, client, middleware, admin (service role — faqat api/)
supabase/
  migrations/           SQL migratsiyalar (RLS siyosatlari, register_organization, audit triggerlari)
  tests/database/       pgTAP testlari
e2e/                    Playwright testlari
```

## Darslar jadvali

- Guruh saqlanganda darslar bugundan 60 kun oldinga yaratiladi (`src/lib/schedule.ts` — toza funksiyalar, testlar bilan).
- Jadval o'zgarsa faqat kelajakdagi, davomati yo'q darslar qayta yaratiladi; bayram kunidagi darslar "bekor qilingan" bo'ladi.
- Har kecha 00:00 (Toshkent) Vercel Cron `GET /api/cron/lessons` ni chaqiradi (`vercel.json`) va jadvalni 60 kunga to'ldiradi. Vercel'da `CRON_SECRET` o'rnatilgan bo'lishi kerak.

## Muhit o'zgaruvchilari

`.env.example` ga qarang. `SUPABASE_SERVICE_ROLE_KEY` faqat serverda ishlatiladi va hech qachon brauzerga chiqmaydi: cron/webhook'lar (`src/app/api/`) va yangi xodim yaratish (`src/features/staff/actions.ts`, faqat `auth.admin.createUser`). ESLint boshqa joylarda `@/lib/supabase/admin` importini taqiqlaydi.

## Ruxsatlar

Ruxsat ikki joyda tekshiriladi: Server Action/sahifada (`requirePermission`, `requirePagePermission`) va bazada (RLS `has_permission()`, himoya triggerlari). Rol — `modul.amal` ruxsatlar to'plami; ro'yxat `src/lib/permissions.ts` da. Hech kim o'zida yo'q ruxsatni boshqaga bera olmaydi; egasi roli va egasi yozuvi faqat egasi tomonidan o'zgaradi. Rollar, xodimlar va filiallar o'zgarishi `audit_log` ga trigger orqali yoziladi.
