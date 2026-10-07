# LAUNCH.md — production promotion runbook (manual steps for Fola)

> Final runbook (Stage L15). Do the steps **in order**. Nothing here is executed by Claude Code: PROD
> credentials never leave you. Tick each box as you go. Times are rough.

## A. Accounts & plans (the week of launch) — 30 min

1. [ ] **Vercel Pro** (Hobby is non-commercial only): Vercel → Settings → Billing.
2. [ ] **Supabase PROD project** exists (SETUP.md §3b) in **London (eu-west-2)**, with the same extensions as DEV
       (`postgis, pg_trgm, unaccent, citext, pg_cron, pg_net, pg_partman`).
3. [ ] **PITR on** for PROD (Database → Backups → Point in Time Recovery). The weekly logical backup in the
       private `backups` bucket (8 weeks kept) is a second line of defence, not a replacement.
4. [ ] **Resend**: the sending domain (`diskova.io`) is **verified** (SPF + DKIM green).

## B. Database — 20 min · follow `scripts/promote-migrations.md`

5. [ ] From a clean checkout of the release commit: `npx supabase link --project-ref <PROD_REF>`,
       `npx supabase db push --dry-run`, then `npx supabase db push`.
6. [ ] Load PROD-safe reference data: `psql "<PROD pooler URL>" -f supabase/seed/reference.sql`.
       **Never** run `supabase/seed/seed.sql` or `npm run db:samples` (`dev-sample-content.sql`) on PROD:
       they add fictional venues and a sample guide.
7. [ ] Run the verification queries in `scripts/promote-migrations.md` §4: 7 pg_cron jobs, 7 storage
       buckets, the `admin_activity_stream_read` Realtime policy, RLS on every public table, reference counts.
8. [ ] **Exposed schemas** (Project Settings → Data API) are exactly `public, graphql_public`. `private`
       must never be listed. Check with `GET https://api.supabase.com/v1/projects/<PROD_REF>/postgrest` →
       `db_schema`.
9. [ ] *(Only if you approved open question 4.)* Store the Vault secrets `app_project_url` and
       `app_service_role_key` on PROD so the daily purge can delete expired uploads, decided verification
       documents (30 days) and deleted accounts' photos. Without them, rows are anonymised but the files stay.

## C. Supabase Auth on PROD — 20 min

10. [ ] **Custom SMTP (Resend)**: Authentication → SMTP Settings (SETUP.md §3a.9). Without it Supabase only
        emails project members and signups fail.
11. [ ] **Email templates** (Authentication → Email Templates), so links work across devices:
        - Confirm signup: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/me?welcome=1`
        - Magic link: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=/me`
        - Reset password: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset/update`
        - Change email: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&next=/me/settings`
12. [ ] **URL configuration**: Site URL `https://diskova.io`; redirect URLs `https://diskova.io/**`.
13. [ ] **Confirm email ON**, **TOTP MFA ON**, password policy = lower + upper + digit, min 8. Anonymous sign-ins OFF.
14. [ ] **Google OAuth**: PROD client ID/secret in Supabase; **publish** the Google consent screen (DEV is in
        Testing mode, so only listed test users can sign in).

## D. Keys & third parties — 30 min

15. [ ] **Rotate** the OpenAI and Groq keys used during the build. Create PROD keys: OpenAI restricted to
        `/v1/moderations`; Groq for P5. The DEV keys have been in `.env.local` for weeks.
16. [ ] **Mapbox PROD token**, URL-restricted to `https://diskova.io/*`. Map previews are fetched server-side
        by `/api/map/city/*` and `/api/map/vendor/*` with `Referer: https://diskova.io/`, so keep the
        production URL in the allow-list. Previews are cached 30 days (about one Static Images call per
        city/venue per month). **Set a usage alert** in Mapbox (e.g. 80 % of the free tier).
17. [ ] **Upstash**: a PROD Redis database (keep it separate from DEV so limits and keys don't mix).
18. [ ] **Sentry**: alerts for new issues and error spikes in the `diskova-web` project (Alerts → Create).
        CSP violations arrive as Security reports; check them after launch.

## E. Vercel Production environment — 20 min

19. [ ] Vercel → Settings → Environment Variables → **Production** (never copy DEV values):
        `NEXT_PUBLIC_SITE_URL=https://diskova.io`, `NEXT_PUBLIC_BRAND_NAME=Diskova`, `NEXT_PUBLIC_CONTACT_EMAIL`,
        `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (PROD publishable key),
        `SUPABASE_SERVICE_ROLE_KEY` (PROD secret key), `SUPER_ADMIN_EMAIL`, `RESEND_API_KEY`, `EMAIL_FROM`,
        `EMAIL_ADMIN_TO`, `NEXT_PUBLIC_MAPBOX_TOKEN` (PROD token), `OPENAI_API_KEY`, `GROQ_API_KEY`, `GROQ_MODEL`,
        `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`,
        `SENTRY_ORG`, `SENTRY_PROJECT`, `CRON_SECRET` (new: `openssl rand -hex 32`),
        `TOKEN_ENCRYPTION_KEY` (new: `openssl rand -hex 32`), and the feature flags `FEATURE_*`
        (`FEATURE_INSTAGRAM_FEED=false`, `FEATURE_VIDEO=false`).
        `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are for local scripts only;
        don't add them to Vercel.
20. [ ] Function region stays **lhr1** (`vercel.json`). The crons in `vercel.json`: daily digest
        `0 7 * * *` (08:00 WAT) and weekly backup `0 3 * * 0`. Both need `CRON_SECRET`.

## F. Deploy & first sign-in — 20 min

21. [ ] Merge `develop` → `main` (the Production branch). Wait for the Vercel production build to go green.
22. [ ] **Super admin**: put `SUPER_ADMIN_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (PROD)
        in a local `.env.production.local` (git-ignored, never committed) and run
        `npx dotenv -e .env.production.local -- npx tsx scripts/create-super-admin.ts`.
        Sign in with a magic link and enrol TOTP at `/admin/mfa`. **Enrol a second TOTP factor** too (phone app
        + password manager): Supabase has no backup codes, and a lost factor can only be removed in Dashboard →
        Authentication → Users → MFA.
23. [ ] Admin → Settings: check the season dates, the free-listing notice and the moderation thresholds.
        Promote moderators/admins from `/admin/users/[id]` (needs a fresh MFA code); each enrols TOTP on first visit.
24. [ ] **Load real content**: `npx dotenv -e .env.production.local -- npx tsx scripts/seed-content.ts`
        (dry run), then add `--confirm=<PROD_REF>` to write (see `content/README.md`). Include **verified**
        safety information (open question 7).
25. [ ] Have `/privacy` and `/terms` reviewed by a lawyer (they're accurate templates); confirm 18+ and the
        contact address (open question 8).

## G. DNS cutover — 15 min (+ propagation)

26. [ ] Vercel → Domains: `diskova.io` (apex) and `www` (redirect to apex). Add the DNS records at the
        registrar; wait for the certificates.
27. [ ] Re-check the Supabase Site URL / redirect URLs, the Google OAuth authorised origins and the Mapbox
        allow-list against the final domain.
28. [ ] Submit `https://diskova.io/sitemap.xml` in Google Search Console. Robots already blocks indexing
        on Vercel Preview (`VERCEL_ENV !== "production"`).

## H. Smoke against PROD & first week — 15 min

29. [ ] **Read-only smoke against PROD** (creates no data; skips checks that need venues):
        ```bash
        PLAYWRIGHT_BASE_URL=https://diskova.io npx playwright test --grep @readonly
        ```
        Do **not** run the full suite against PROD: it creates users, venues and events. The full suite runs
        against Vercel Preview + DEV: `PLAYWRIGHT_BASE_URL=<preview-url> npm run smoke:remote`, with
        `VERCEL_AUTOMATION_BYPASS_SECRET` set (open question 9).
30. [ ] Manual check on a real phone: sign up (email arrives, link works on the phone), pulse a venue, check
        in with a photo, open the map, add an event to calendar, share to WhatsApp.
31. [ ] Lighthouse (mobile) on `/`, `/c/lagos`, a venue page and a guide: targets ≥ 90 perf / ≥ 95 a11y /
        100 SEO (DEV measured 91–93 / 100 / 100).
32. [ ] After the first Sunday: Storage → `backups/weekly/` has a file and the audit log has `system.backup`.
        After the first morning: the daily digest arrived at `EMAIL_ADMIN_TO`.
33. [ ] After a breaking front-end change, bump `VERSION` in `public/sw.js` so every device drops its offline
        cache (it keeps up to 20 guides per device).

---

## Known limitations at launch

- **Storage file deletion waits on open question 4 (Vault).** Until then, deleted accounts and decided
  verification requests are anonymised in the database, but their files stay in Storage, and expired
  incoming uploads aren't purged. Rows are never falsely marked purged.
- **Email-dependent flows need custom SMTP** on each project (open question 5).
- **Safety information** ships with only the national numbers and LASEMA, marked "not yet verified", until
  verified content is loaded (open question 7).
- **Legal pages are templates** pending legal review (open question 8).
- **Smoke against Vercel Preview** needs `VERCEL_AUTOMATION_BYPASS_SECRET` (open question 9). The same suite
  is green against a local production build on DEV.
- **MFA has no backup codes** (Supabase TOTP). Recovery = a second enrolled factor or a dashboard reset.
- **Backups are logical** (gzipped NDJSON of every public + private table), not `pg_dump` (Vercel functions
  don't have it). `auth.*` is covered only by PITR. Activity telemetry is excluded.
- **Photo check-ins are web-only.** The public API accepts text check-ins, pulses and reports; photos need the
  app's one-image-per-request upload pipeline.
- **Live activity stream** shows activity events in real time; the audit log is shown on load, not live.
- **Cities & areas** are edited as centroids (map pin). Polygons and bounding boxes aren't editable in the UI.
- **Browser errors in the first seconds** of a page view are buffered until the lazily loaded Sentry SDK
  starts. They're lost only if the visitor leaves before then.
- **Offline mode** covers the last 20 guide/safety pages read and an offline page. Live data needs a connection.
- **IP/device signals are informational only** (carrier-grade NAT); they never trigger automatic sanctions.
- **Admin tables** scroll horizontally on phones; the back office is designed for laptop use, with key
  actions still usable at 375 px.
- **Dev-tooling `npm audit` advisories** (open question 1) affect build tooling only; the production
  dependency tree is clean.
- **Agent API keys are per environment.** Keys created on DEV don't work on PROD: create PROD keys in PROD
  Admin → Settings (super admin + fresh MFA). See `docs/agent-api.md`.
- **Post-launch stages P1–P5** (Agent API, saved lists, Q&A, itineraries, AI assistant) are built after
  L15 on `develop` and ship in later releases. P6/P7 (Instagram feed, video) are off by feature flag.
