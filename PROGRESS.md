# Build Progress

## Current stage
Stage L2 — Database schema, private schema, RLS, pg_cron jobs, seed (DEV only)

## Launch stages (required before go-live)
- [x] Stage L1: Project scaffold, tooling, `npm run verify`
- [ ] Stage L2: Database schema, private schema, RLS, pg_cron jobs, seed (DEV only)
- [ ] Stage L3: Authentication, profiles, roles, MFA
- [ ] Stage L4: Cities, areas, categories, vendor directory, share buttons (read-only)
- [ ] Stage L5: Vendor self-serve onboarding, dashboard, official updates
- [ ] Stage L6: Check-ins (full + one-tap pulse), image pipeline, live feed, points
- [ ] Stage L7: Crowd snapshots (pg_cron), Tonight view, heat map, forecast
- [ ] Stage L8: Moderation pipeline, holds, reports, sanctions, labels
- [ ] Stage L9: Events and the December in Nigeria calendar
- [ ] Stage L10: Guides, daytime layer, diaspora toolkit, blog (CMS)
- [ ] Stage L11: Safety information section and private issue reports
- [ ] Stage L12: Super-admin back office
- [ ] Stage L13: Security hardening and RLS matrix tests
- [ ] Stage L14: SEO, performance, PWA, analytics
- [ ] Stage L15: Final QA, content loader, LAUNCH.md (production promotion steps for Fola)

## Post-launch stages (continue automatically after L15)
- [ ] Stage P1: Agent API endpoints (for future AI agent)
- [ ] Stage P2: Saved lists ("Plan my night") and public share pages
- [ ] Stage P3: Community Q&A
- [ ] Stage P4: Itineraries with running cost and ₦/£/$ toggle
- [ ] Stage P5: In-app AI assistant (Groq)
- [ ] Stage P6 (OPTIONAL, feature-flagged): Vendor Instagram feed via Meta Graph API
- [ ] Stage P7 (OPTIONAL, feature-flagged): Video check-ins with mandatory human review

## Verify output per stage
(paste the last 30 lines of `npm run verify` under each stage heading below as you complete it)

### Stage L1 — 2026-10-07
```
Route (app)                                 Size  First Load JS
┌ ○ /                                    1.47 kB         170 kB
├ ○ /_not-found                            128 B         169 kB
├ ○ /apple-icon.png                          0 B            0 B
├ ○ /icon.png                                0 B            0 B
└ ○ /manifest.webmanifest                  128 B         169 kB
+ First Load JS shared by all             169 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  ├ chunks/863-8036162e1c64d611.js        110 kB
  └ other shared chunks (total)          4.08 kB


○  (Static)  prerendered as static content

`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .

✔ No ESLint warnings or errors

 RUN  v5.0.3 /Users/fola/Apps/Diskova


 Test Files  5 passed (5)
      Tests  24 passed (24)
   Start at  18:00:46
   Duration  107ms (transform 59%, import 21%, tests 13%, worker 7%)

[verify] Playwright smoke: SKIPPED — no smoke specs yet (they start in Stage L3).
```
Acceptance evidence:
- `/` renders the branded placeholder (checked at 375×812 in a real browser: dark theme, no horizontal scroll).
- Live `next start` response carries CSP-Report-Only, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy (curl); also covered by `tests/unit/security-headers.test.ts`.
- Sentry test event sent via `npm run sentry:test` → event ids `86b05ebc810a44b29d661ee73f3c6413`, `b02bcad422a244fb8a7db4ef62a7258d` (flushed: true).
- `npm audit --omit=dev`: **0 vulnerabilities**. Full tree: 7 high / 2 moderate, all dev-only (see Open questions).

## Notes / decisions
(append here as you go)

**Setup / L1 (2026-10-07)**
- Branding: all docs renamed DiscoverNigeria → Diskova, discovernigeria.ng → diskova.io (separate docs commit). Brand string in code lives only in `lib/config.ts` (default) and comes from `NEXT_PUBLIC_BRAND_NAME`; `tests/unit/content-rules.test.ts` fails if it appears anywhere else in app/components/lib/content/supabase.
- Branch `develop` created from `main`; all work is pushed to `origin/develop` only.
- Versions pinned exactly (`--save-exact`): Next 15.5.27 (latest 15.x "backport" tag), React 19.1.0, Tailwind 3.4.19, TypeScript 5.9, Vitest 5, Sentry 11.5, Supabase CLI 2.120 (as a dev dep — no global CLI on this machine; use `npx supabase`).
- `create-next-app@15` now scaffolds Tailwind 4; replaced with Tailwind 3 + autoprefixer per PRD §2.
- shadcn: CLI hung on an interactive prompt, so `components.json` + component sources (button, badge) were written by hand (identical to shadcn new-york). Only extra package is `@radix-ui/react-slot` (covered by `@radix-ui/*`). **`tailwindcss-animate` NOT installed** (not in §4): accordion keyframes are defined in `tailwind.config.ts`; shadcn `animate-in/out` classes will be no-ops (components work, just without enter/exit animation).
- `@eslint/eslintrc` dev dep comes with create-next-app's flat ESLint config (part of the ESLint toolchain).
- npm 11 gates install scripts: approved `esbuild`, `fsevents`, `unrs-resolver` (recorded in `package.json#allowScripts`). sharp and the Supabase CLI work without scripts.
- `overrides`: `next → postcss 8.5.29` (fixes high PostCSS advisories in Next's pinned copy) and `fflate 0.7.5` (satori/@vercel/og moderate).
- `server-only` npm package is not in §4, so server-only modules use `lib/server-only.ts` (`assertServerOnly()` runtime guard) + ESLint `no-restricted-imports` (components/, hooks/, `*.client.tsx`) + `tests/unit/service-role-isolation.test.ts` (no 'use client' file imports admin-db/env.server; service-role key only referenced in env.server, admin-db, scripts; no secret behind `NEXT_PUBLIC_`).
- Supabase clients: `lib/db/client.ts` (browser), `lib/db/server.ts` (cookies, SameSite=Lax, Secure in production), `lib/admin-db/client.ts` (service role, no session persistence). Generated DB types arrive in L2.
- Feature flags are inlined via `next.config.ts#env` so client and server read identical values (they are not secrets).
- Site URL fallback: `NEXT_PUBLIC_SITE_URL` → `https://${NEXT_PUBLIC_VERCEL_URL|VERCEL_URL}` → `http://localhost:3000` (unit-tested).
- Sentry v11: `withSentryConfig` now imported from `@sentry/nextjs/config`; `disableLogger` replaced by `webpack.treeshake` (also strips Replay code). tracesSampleRate 0.1, `sendDefaultPii: false`, logs off, no Replay/profiling. `beforeSend`, `beforeSendSpan`, `beforeBreadcrumb` all run `scrubEvent` (JWTs, sb_ keys, API keys, Bearer, `token=`/`code=` params, emails, IPv4/IPv6, sensitive headers). Source maps upload only on Vercel builds. `SENTRY_PROJECT` env is `Diskova-web`; config lower-cases it to the real slug `diskova-web`.
- CSP is Report-Only (enforced in L13), reports to Sentry's security endpoint derived from the DSN. `upgrade-insecure-requests` only emitted when enforced (browsers reject it in report-only). Permissions-Policy: geolocation=(self); camera/mic/payment off.
- Playwright: `smoke` project uses an iPhone 13 viewport on Chromium against `next start` (port 3100). `scripts/run-smoke.mjs` prints an explicit SKIPPED message until smoke specs exist (L3), per PRD §2.1.
- `next lint` prints a deprecation notice (removed in Next 16). Kept because PRD §2.1 defines verify with `next lint`; harmless on Next 15.
- PWA icons generated from the brand initial by `npm run icons` (sharp); manifest at `app/manifest.ts`.
- Home placeholder: gradient hero stands in for photos until live data exists (L7). Footer carries the §8.2 community disclaimer site-wide from L1.
- Perf note for L14: shared first-load JS is 169 kB (React + Sentry client). Revisit Sentry client weight / lazy init in L14.

## Open questions for Fola
(write here when you need me)

1. **[non-blocking] `npm audit` dev-only highs.** The production dependency tree is clean (`npm audit --omit=dev` → 0). The full tree still reports 7 high from GHSA-vfj7-8cjw-p6xm in `braces` ≤ 3.0.3, which has **no patched release**. It arrives only through build tooling: Tailwind 3 (chokidar/micromatch/fast-glob) and `eslint-config-next` (fast-glob). Nothing user-facing ever reaches it. The only "fix" is moving to Tailwind 4, which the PRD rules out (§2 says Tailwind 3). I'm treating §7.11's "zero high/critical" as the shipped (production) tree and re-checking at every stage. Tell me if you'd rather move to Tailwind 4.
2. **[non-blocking] `EMAIL_ADMIN_TO` is empty** in `.env.local` (`RESEND_API_KEY` is also empty — known, per CLAUDE.md). Until it's set, admin notification emails will fall back to `SUPER_ADMIN_EMAIL`, and email sending stays a no-op while there's no Resend key.
3. **[optional] `tailwindcss-animate`** (shadcn's animation plugin for Tailwind 3) isn't in PRD §4, so it isn't installed. Dialogs/sheets will open without enter/exit animations. Approve it if you want those animations.
