# Diskova — web

Real-time "what's happening right now" platform for going out in, and travelling to, Nigeria.
The product spec is [PRD.md](PRD.md); build progress is tracked in [PROGRESS.md](PROGRESS.md);
working rules are in [CLAUDE.md](CLAUDE.md).

> The brand name shown in the product comes only from `NEXT_PUBLIC_BRAND_NAME` (read in `lib/config.ts`).

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 3 + shadcn/ui · Supabase
(Postgres + PostGIS, Auth, Storage, Realtime, pg_cron) · Upstash rate limiting · Sentry · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in DEV values (see SETUP.md)
npm run dev                  # http://localhost:3000
```

`.env.local` must point at the **DEV** Supabase project. Production credentials never live in this repo.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run verify` | **The gate for every stage/commit:** `next build && next lint && tsc --noEmit && vitest run && playwright smoke` |
| `npm test` | Vitest unit + RLS tests |
| `npm run test:smoke` | Playwright smoke project (skipped with a message until smoke specs exist) |
| `npm run icons` | Regenerate PWA icons from the brand initial |
| `npm run sentry:test` | Send one scrubbed test event to Sentry |
| `npm run format` | Prettier |

## Layout

```
app/            routes (App Router)
components/     ui/ (shadcn), layout/, feature components — never import lib/admin-db
lib/config.ts   brand, site URL, feature flags (public, client-safe)
lib/env.server.ts  server secrets (server-only)
lib/db/         Supabase clients acting as the user (RLS)
lib/admin-db/   service-role client (server-only; ESLint + tests enforce isolation)
lib/services/   business logic; Server Actions / Route Handlers are thin wrappers
lib/security/   security headers / CSP
supabase/       migrations, seed, SQL functions for pg_cron
scripts/        one-off scripts (may use the service role)
tests/          unit/, rls/, smoke/
```

## Branches and deploys

- Work happens on `develop`; every push builds a Vercel Preview against the DEV database.
- `main` is Vercel Production and is only updated during launch (see `LAUNCH.md`, written in Stage L15).
- Vercel functions run in `lhr1` (`vercel.json`).
