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

Supabase'siz ham `pnpm dev` ishlaydi (faqat development rejimida): qobiq va sahifalar ochiladi, auth esa 1-bosqichda ulanadi. Production'da (`pnpm start`) Supabase env bo'lmasa server xato beradi.

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
| `pnpm db:types`                     | Supabase'dan TypeScript turlarini generatsiya qilish |

Har bosqich oxirida: `pnpm lint && pnpm typecheck && pnpm test`.

Playwright brauzeri: `pnpm exec playwright install chromium`. Boshqa versiyadagi Chromium'dan foydalanish uchun: `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome pnpm e2e`.

## Tuzilma

```
messages/               uz.json, ru.json — barcha UI matnlari
src/
  app/(app)/[branchId]/ ichki sahifalar; [branchId] = filial uuid yoki "all"
  components/ui/        shadcn komponentlari
  components/           umumiy komponentlar (EmptyState, ...)
  features/<modul>/     modul kodi (shell — sidebar, header, filial tanlagich)
  i18n/                 next-intl sozlamalari (til cookie'da, URL'da emas)
  lib/
    money.ts            formatMoney → "1 250 000 so'm"
    dates.ts            KK.OO.YYYY, HH:mm, Asia/Tashkent
    phone.ts            +998XXXXXXXXX normalizatsiya, operator kodlari
    supabase/           server, client, middleware, admin (service role — faqat api/)
supabase/
  migrations/           SQL migratsiyalar
e2e/                    Playwright testlari
```

## Muhit o'zgaruvchilari

`.env.example` ga qarang. `SUPABASE_SERVICE_ROLE_KEY` faqat serverda (cron va webhook'lar) ishlatiladi va hech qachon brauzerga chiqmaydi. ESLint `@/lib/supabase/admin` ni `src/app/api/` dan tashqarida import qilishni taqiqlaydi.
