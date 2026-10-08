# Build Progress

## Current stage
All stages complete: L1–L15, P1–P5 and the UX/UI upgrade U1 (requested by Fola on 8 Oct 2026). P6 and P7 are skipped (feature flags `FEATURE_INSTAGRAM_FEED` / `FEATURE_VIDEO` are false). Waiting on the open questions below.

## Launch stages (required before go-live)
- [x] Stage L1: Project scaffold, tooling, `npm run verify`
- [x] Stage L2: Database schema, private schema, RLS, pg_cron jobs, seed (DEV only)
- [x] Stage L3: Authentication, profiles, roles, MFA
- [x] Stage L4: Cities, areas, categories, vendor directory, share buttons (read-only)
- [x] Stage L5: Vendor self-serve onboarding, dashboard, official updates
- [x] Stage L6: Check-ins (full + one-tap pulse), image pipeline, live feed, points
- [x] Stage L7: Crowd snapshots (pg_cron), Tonight view, heat map, forecast
- [x] Stage L8: Moderation pipeline, holds, reports, sanctions, labels
- [x] Stage L9: Events and the December in Nigeria calendar
- [x] Stage L10: Guides, daytime layer, diaspora toolkit, blog (CMS)
- [x] Stage L11: Safety information section and private issue reports
- [x] Stage L12: Super-admin back office
- [x] Stage L13: Security hardening and RLS matrix tests
- [x] Stage L14: SEO, performance, PWA, analytics
- [x] Stage L15: Final QA, content loader, LAUNCH.md (production promotion steps for Fola) — *smoke on the protected Vercel Preview waits on open question 9; the same suite is green locally against DEV*

## Post-launch stages (continue automatically after L15)
- [x] Stage P1: Agent API endpoints (for future AI agent)
- [x] Stage P2: Saved lists ("Plan my night") and public share pages
- [x] Stage P3: Community Q&A
- [x] Stage P4: Itineraries with running cost and ₦/£/$ toggle
- [x] Stage P5: In-app AI assistant (Groq)
- [ ] Stage P6 (OPTIONAL, feature-flagged): Vendor Instagram feed via Meta Graph API — **skipped: `FEATURE_INSTAGRAM_FEED=false`**
- [ ] Stage P7 (OPTIONAL, feature-flagged): Video check-ins with mandatory human review — **skipped: `FEATURE_VIDEO=false`**

## Design stages (requested by Fola, 8 Oct 2026)
- [x] Stage U1: UX/UI upgrade — every fix from `docs/ux-audit.md` (presentation only; no business logic, schema or route changes)

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

### Stage L2 — 2026-10-07
```
Route (app)                                 Size  First Load JS
┌ ○ /                                    1.47 kB         170 kB
├ ○ /_not-found                            128 B         169 kB
├ ○ /apple-icon.png                          0 B            0 B
├ ○ /icon.png                                0 B            0 B
└ ○ /manifest.webmanifest                  128 B         169 kB
+ First Load JS shared by all             169 kB
  ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
  ├ chunks/863-5a5b1d1e9dc43920.js        110 kB
  └ other shared chunks (total)          4.08 kB


○  (Static)  prerendered as static content

`next lint` is deprecated and will be removed in Next.js 16.
For new projects, use create-next-app to choose your preferred linter.
For existing projects, migrate to the ESLint CLI:
npx @next/codemod@canary next-lint-to-eslint-cli .

✔ No ESLint warnings or errors

 RUN  v5.0.3 /Users/fola/Apps/Diskova


 Test Files  6 passed (6)
      Tests  50 passed (50)
   Start at  18:21:26
   Duration  6.54s (tests 98%, import 1%, transform 1%)

[verify] Playwright smoke: SKIPPED — no smoke specs yet (they start in Stage L3).
```
Acceptance evidence:
- `npm run db:push` applied `0001`–`0032` to DEV cleanly (a full dry run inside a rolled-back transaction passed first).
- `tests/rls/l2-core.test.ts` (26 tests, against DEV over the Data API): private schema → `PGRST106 Invalid schema` for anon **and** service role; Management API confirms exposed schemas exclude `private`; anon/other users can't see pending, held or hidden posts; author sees own; shadowbanned author sees own post, others and anon don't; shadow flag unreadable (column privilege) and hidden from the user's own sanctions; pulse auto-publishes; impersonation / server-owned columns / non-member official posts / anon / unverified inserts all denied; owner can submit vendor for review but not publish or verify; auto-block queues a P1 moderation item.
- pg_cron: 7 jobs listed via `admin_list_cron_jobs()`; scheduled `crowd-snapshots` run status `succeeded`; every job function invoked manually without error.
- Seed: 6 cities, 40 areas (12/8/6/6/4/4), 19 categories, 60 draft `is_seed` vendors, 12 toolkit drafts, 3 safety rows, season 2026-11-15→2027-01-10; loaded twice to prove idempotency.
- Audit log: UPDATE / DELETE / TRUNCATE rejected even as `postgres` (trigger) — API roles hold no privileges at all.
- `supabase db advisors --type security`: only 2 WARN (leaderboard materialized views readable by API — intentional, public fields only).

### Stage L3 — 2026-10-07
```

 RUN  v5.0.3 /Users/fola/Apps/Diskova


 Test Files  8 passed (8)
      Tests  61 passed (61)
   Start at  18:34:13
   Duration  7.19s (tests 97%, import 2%, transform 1%)

    Isolate  8 workers spawned · ~54ms startup each (spawn + environment, per file)
             at least ~380ms faster with isolate: false — reuses workers across files instead of one per file

[verify] Playwright smoke: running 3 spec file(s)…

Running 12 tests using 3 workers

  ✓   2 [smoke] › tests/smoke/auth.spec.ts:11:5 › home renders the branded shell with security headers (266ms)
  ✓   4 [smoke] › tests/smoke/auth.spec.ts:20:5 › protected pages send anonymous visitors to login with a safe next (242ms)
  ✓   5 [smoke] › tests/smoke/auth.spec.ts:27:5 › signup form validates before calling the server (263ms)
  ✓   3 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.9s)
  ✓   1 [smoke] › tests/smoke/admin-mfa.spec.ts:21:5 › admin without MFA is redirected to enrol, and gets in after verifying a TOTP code (2.9s)
  ✓   6 [smoke] › tests/smoke/auth.spec.ts:36:5 › signup → verify → login (2.2s)
  ✓   9 [smoke] › tests/smoke/auth.spec.ts:75:5 › used or invalid links land on login with a clear message (262ms)
  ✓  10 [smoke] › tests/smoke/auth.spec.ts:81:5 › open redirects are refused after login (1.2s)
  ✓   8 [smoke] › tests/smoke/admin-mfa.spec.ts:42:5 › non-staff users get a 404 for admin pages (2.0s)
  ✓   7 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.6s)
  ✓  11 [smoke] › tests/smoke/auth.spec.ts:93:5 › password reset: recovery link → choose new password → sign in with it (3.2s)
  ✓  12 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (2.4s)

  12 passed (11.6s)
```
Acceptance evidence:
- **Unverified user blocked from posting:** Supabase `Confirm email` stops unverified sign-in (smoke: "confirm your email first"); RLS `is_verified_user()` blocks inserts (L2 RLS test); `requireVerifiedUser()` guards server paths.
- **Admin without MFA redirected:** smoke `admin-mfa.spec.ts`. An aal1 admin is sent to `/admin/mfa`, enrols TOTP (code computed from the shown secret), lands on `/admin` with an aal2 session. Non-staff get 404 on `/admin` and `/admin/mfa`.
- **Playwright signup → verify → login green** against DEV: user created + token via `auth.admin.generateLink` (no email), verified through `/auth/callback?token_hash…`, profile `email_verified_at` synced by trigger, signed out, signed back in via the UI.
- Also green: password reset via recovery link; profile edit; avatar through signed upload → `/api/media/process` (512² WebP, EXIF stripped, incoming object deleted); delete account (profile anonymised, sign-in blocked); invalid/used link handling; open-redirect refusal; protected-route redirects.
- `npm audit --omit=dev`: 0.

### Stage L4 — 2026-10-07
```
 Test Files  10 passed (10)
      Tests  74 passed (74)
   Start at  18:51:00
   Duration  11.98s (tests 94%, import 5%, transform 1%)

[verify] Playwright smoke: running 4 spec file(s)…

Running 19 tests using 4 workers

  ✓   3 [smoke] › tests/smoke/auth.spec.ts:11:5 › home renders the branded shell with security headers (281ms)
  ✓   1 [smoke] › tests/smoke/directory.spec.ts:9:5 › city directory lists published seed vendors with open-now status (502ms)
  ✓   5 [smoke] › tests/smoke/auth.spec.ts:20:5 › protected pages send anonymous visitors to login with a safe next (238ms)
  ✓   7 [smoke] › tests/smoke/auth.spec.ts:27:5 › signup form validates before calling the server (282ms)
  ✓   6 [smoke] › tests/smoke/directory.spec.ts:18:5 › category chip, area and price filters narrow the list (1.6s)
  ✓   9 [smoke] › tests/smoke/directory.spec.ts:37:5 › unknown city and unpublished vendor return 404 (264ms)
  ✓   4 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.9s)
  ✓   2 [smoke] › tests/smoke/admin-mfa.spec.ts:21:5 › admin without MFA is redirected to enrol, and gets in after verifying a TOTP code (3.0s)
  ✓   8 [smoke] › tests/smoke/auth.spec.ts:36:5 › signup → verify → login (2.9s)
  ✓  13 [smoke] › tests/smoke/auth.spec.ts:75:5 › used or invalid links land on login with a clear message (282ms)
  ✓  10 [smoke] › tests/smoke/directory.spec.ts:42:5 › map loads only when toggled (2.0s)
  ✓  15 [smoke] › tests/smoke/directory.spec.ts:62:5 › vendor page: header, prices, hours, deep links and share (193ms)
  ✓  14 [smoke] › tests/smoke/auth.spec.ts:81:5 › open redirects are refused after login (1.1s)
  ✓  12 [smoke] › tests/smoke/admin-mfa.spec.ts:42:5 › non-staff users get a 404 for admin pages (2.1s)
  ✓  16 [smoke] › tests/smoke/directory.spec.ts:88:5 › search finds venues by partial name, with typeahead (1.1s)
  ✓  18 [smoke] › tests/smoke/directory.spec.ts:97:5 › sitemap lists cities and vendors; OG image renders (353ms)
  ✓  11 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (5.0s)
  ✓  17 [smoke] › tests/smoke/auth.spec.ts:93:5 › password reset: recovery link → choose new password → sign in with it (2.9s)
  ✓  19 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (2.3s)

  19 passed (12.1s)
```
Acceptance evidence:
- **Seed vendors render:** smoke `directory.spec.ts`: `/c/lagos` lists all 10 Lagos sample vendors; category / area / price + feature filters narrow correctly; junk query values are ignored (200, full list).
- **Map loads only on toggle:** smoke asserts zero Mapbox GL / tile / style / telemetry requests and no `.mapboxgl-map` before clicking; after clicking, the GL map mounts and requests tiles. Also checked by hand in the browser: 10 pins on the Lagos map.
- **Open-now correct in Africa/Lagos:** `tests/unit/opening-hours.test.ts` (9 cases: overnight spill-over, exact close, split days, next-day/next-week opening, UTC vs Lagos, 24 h days).
- **Lighthouse mobile (vendor page, map closed):** performance **90** (3 runs: 90/90/90), accessibility 100, best practices 100, SEO 100. LCP 3.6 s, TBT ≤ 40 ms, CLS 0.004. Before the font + header-JS fixes it was 82–87. Also measured: home 89/100/100/100, city page 83–89/100/100/100 (to be tuned in L14).
- Deep links (Uber/Bolt/Directions/WhatsApp formats, `rel=nofollow noopener`), WhatsApp share + copy link, search with typeahead, sitemap entries and the per-vendor OG image are all covered by smoke tests.

### Stage L5 — 2026-10-07
```

[verify] Playwright smoke: running 5 spec file(s)…

Running 23 tests using 5 workers

  ✓   3 [smoke] › tests/smoke/auth.spec.ts:11:5 › home renders the branded shell with security headers (423ms)
  ✓   6 [smoke] › tests/smoke/auth.spec.ts:20:5 › protected pages send anonymous visitors to login with a safe next (268ms)
  ✓   1 [smoke] › tests/smoke/directory.spec.ts:9:5 › city directory lists published seed vendors with open-now status (730ms)
  ✓   7 [smoke] › tests/smoke/auth.spec.ts:27:5 › signup form validates before calling the server (345ms)
  ✓   8 [smoke] › tests/smoke/directory.spec.ts:18:5 › category chip, area and price filters narrow the list (1.9s)
  ✓  10 [smoke] › tests/smoke/directory.spec.ts:37:5 › unknown city and unpublished vendor return 404 (352ms)
  ✓   4 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (3.7s)
  ✓   2 [smoke] › tests/smoke/admin-mfa.spec.ts:21:5 › admin without MFA is redirected to enrol, and gets in after verifying a TOTP code (3.8s)
  ✓   9 [smoke] › tests/smoke/auth.spec.ts:36:5 › signup → verify → login (3.4s)
  ✓  14 [smoke] › tests/smoke/auth.spec.ts:75:5 › used or invalid links land on login with a clear message (532ms)
  ✓  11 [smoke] › tests/smoke/directory.spec.ts:42:5 › map loads only when toggled (2.1s)
  ✓  16 [smoke] › tests/smoke/directory.spec.ts:62:5 › vendor page: header, prices, hours, deep links and share (283ms)
  ✓  13 [smoke] › tests/smoke/admin-mfa.spec.ts:42:5 › non-staff users get a 404 for admin pages (2.0s)
  ✓  17 [smoke] › tests/smoke/directory.spec.ts:88:5 › search finds venues by partial name, with typeahead (1.3s)
  ✓  15 [smoke] › tests/smoke/auth.spec.ts:81:5 › open redirects are refused after login (1.7s)
  ✓  18 [smoke] › tests/smoke/directory.spec.ts:97:5 › sitemap lists cities and vendors; OG image renders (329ms)
  ✓  12 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.4s)
  ✓  19 [smoke] › tests/smoke/auth.spec.ts:93:5 › password reset: recovery link → choose new password → sign in with it (3.0s)
  ✓  20 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (3.3s)
  ✓   5 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (13.7s)
  ✓  21 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.7s)
  ✓  22 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.4s)
  ✓  23 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (7.4s)

  23 passed (30.3s)
```
Vitest in the same run: `Test Files  12 passed (12) Tests  85 passed (85)`

Acceptance evidence:
- **Fresh account → submitted vendor < 10 min:** smoke `vendor.spec.ts` goes through all six wizard steps (basics → contact → cover photo through the pipeline → hours/price band → prices → review → submit) in ~12 s of automation. A human doing the same is ~5 minutes. Checked: status `pending_review`, `claim_status` claimed, cover in `vendor-assets`, 1 price row. The free-listing notice shows at step 1.
- **Admin approval:** admin with TOTP MFA approves on `/admin/vendors` → `published`, page returns 200. Rejecting without a reason is refused.
- **Official update appears labelled Official:** the owner taps "Busy" then "Post official update" (two taps) → the venue page shows it pinned with the "Official" badge ("Official · Verified vendor" for verified venues) and the crowd level.
- **Claim flow:** the claimant uploads a photo ID to the private bucket. Admin sees a 10-minute signed link and approves. Claimant becomes owner; vendor is claimed + verified.
- RLS (`tests/rls/l5-vendor.test.ts`): owner edits / staff member and outsider can't; staff can post official, outsider can't; `vendor_posting_ban` blocks official posts; only managers+ change prices; verification RPCs are service-only; users see only their own requests; `verification-docs` is not readable or writable by users.
- Moderation decision rules unit-tested (`tests/unit/moderation-decide.test.ts`): block / flag / holds for new and low-trust accounts / pulse and text never held / video always held.

### Stage L6 — 2026-10-07
```
Running 26 tests using 6 workers

  ✓   3 [smoke] › tests/smoke/auth.spec.ts:11:5 › home renders the branded shell with security headers (420ms)
  ✓   1 [smoke] › tests/smoke/directory.spec.ts:9:5 › city directory lists published seed vendors with open-now status (657ms)
  ✓   7 [smoke] › tests/smoke/auth.spec.ts:20:5 › protected pages send anonymous visitors to login with a safe next (371ms)
  ✓   9 [smoke] › tests/smoke/auth.spec.ts:27:5 › signup form validates before calling the server (347ms)
  ✓   8 [smoke] › tests/smoke/directory.spec.ts:19:5 › category chip, area and price filters narrow the list (2.7s)
  ✓   4 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (3.7s)
  ✓  11 [smoke] › tests/smoke/directory.spec.ts:45:5 › unknown city and unpublished vendor return 404 (624ms)
  ✓   2 [smoke] › tests/smoke/admin-mfa.spec.ts:21:5 › admin without MFA is redirected to enrol, and gets in after verifying a TOTP code (4.0s)
  ✓  10 [smoke] › tests/smoke/auth.spec.ts:36:5 › signup → verify → login (3.4s)
  ✓  15 [smoke] › tests/smoke/auth.spec.ts:75:5 › used or invalid links land on login with a clear message (348ms)
  ✓  13 [smoke] › tests/smoke/directory.spec.ts:50:5 › map loads only when toggled (2.0s)
  ✓  14 [smoke] › tests/smoke/admin-mfa.spec.ts:42:5 › non-staff users get a 404 for admin pages (2.0s)
  ✓  17 [smoke] › tests/smoke/directory.spec.ts:70:5 › vendor page: header, prices, hours, deep links and share (259ms)
  ✓  16 [smoke] › tests/smoke/auth.spec.ts:81:5 › open redirects are refused after login (1.7s)
  ✓  18 [smoke] › tests/smoke/directory.spec.ts:96:5 › search finds venues by partial name, with typeahead (1.4s)
  ✓  20 [smoke] › tests/smoke/directory.spec.ts:105:5 › sitemap lists cities and vendors; OG image renders (501ms)
  ✓  12 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (5.3s)
  ✓  19 [smoke] › tests/smoke/auth.spec.ts:93:5 › password reset: recovery link → choose new password → sign in with it (2.7s)
  ✓  21 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (2.3s)
  ✓   5 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (15.3s)
  ✓   6 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (18.5s)
  ✓  22 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.1s)
  ✓  24 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.7s)
  ✓  25 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (12.7s)
  ✓  23 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (20.7s)
  ✓  26 [smoke] › tests/smoke/feed.spec.ts:128:5 › my posts, public profile and leaderboard pages render (8.3s)

  26 passed (55.5s)
```
Vitest in the same run: `Test Files  14 passed (14) Tests  96 passed (96)`

Acceptance evidence:
- **Two browsers, ≤ 2 s (auth) / ≤ 30 s (anon):** smoke `feed.spec.ts`. One user pulses, a second signed-in browser sees it via Supabase Realtime in **490 ms**, and an anonymous browser sees it via polling within the 30 s budget.
- **Pulse is one tap:** the same test posts with a single click on "Pulse: Packed".
- **4-image check-in with no request > 5 s:** four 2400×1800 noisy JPEGs, each signed-uploaded and processed in its own `/api/media/process` call. Every POST/upload is timed and the slowest was **1,955 ms**. The post publishes with 4 processed media rows; cards show "Community photo · Unverified" and "Unverified — posted by a community member".
- **Points per rules + daily cap:** `tests/rls/l6-posts-points.test.ts` against DEV: pulse +1; first check-in of the day at a venue 3 + 5, the next person 3; awards are idempotent per post; the 60/day cap trims the last award (2 of 5 granted); a new account's photo check-in is held (pending, invisible to anon, P2 `hold` queue item, 0 points). `tests/unit/points.test.ts` covers the cap maths.
- Also tested: likes toggle once per user; reports are unique per user per item; a post's `location` / `distance_from_venue_m` / moderation internals and `post_media.phash` are unreadable by anon and users (42501).
- Lighthouse (vendor page, map closed) after L6: performance 88 (3 runs), accessibility 100.

### Stage L7 — 2026-10-07
```
  ✓   3 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (777ms)
  ✓   1 [smoke] › tests/smoke/directory.spec.ts:9:5 › city directory lists published seed vendors with open-now status (1.1s)
  ✓   9 [smoke] › tests/smoke/auth.spec.ts:27:5 › signup form validates before calling the server (359ms)
  ✓   2 [smoke] › tests/smoke/admin-mfa.spec.ts:21:5 › admin without MFA is redirected to enrol, and gets in after verifying a TOTP code (4.1s)
  ✓   6 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (4.9s)
  ✓  12 [smoke] › tests/smoke/auth.spec.ts:36:5 › signup → verify → login (4.7s)
  ✓  11 [smoke] › tests/smoke/directory.spec.ts:19:5 › category chip, area and price filters narrow the list (5.3s)
  ✓  15 [smoke] › tests/smoke/auth.spec.ts:75:5 › used or invalid links land on login with a clear message (417ms)
  ✓  16 [smoke] › tests/smoke/directory.spec.ts:45:5 › unknown city and unpublished vendor return 404 (579ms)
  ✓  13 [smoke] › tests/smoke/admin-mfa.spec.ts:42:5 › non-staff users get a 404 for admin pages (2.7s)
  ✓  10 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (6.0s)
  ✓  17 [smoke] › tests/smoke/auth.spec.ts:81:5 › open redirects are refused after login (1.3s)
  ✓  18 [smoke] › tests/smoke/directory.spec.ts:50:5 › map loads only when toggled (1.9s)
  ✓  19 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (2.0s)
  ✓  21 [smoke] › tests/smoke/directory.spec.ts:70:5 › vendor page: header, prices, hours, deep links and share (235ms)
  ✓  22 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (168ms)
  ✓  14 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (5.1s)
  ✓  23 [smoke] › tests/smoke/directory.spec.ts:96:5 › search finds venues by partial name, with typeahead (1.4s)
  ✓  25 [smoke] › tests/smoke/directory.spec.ts:105:5 › sitemap lists cities and vendors; OG image renders (683ms)
  ✓  20 [smoke] › tests/smoke/auth.spec.ts:93:5 › password reset: recovery link → choose new password → sign in with it (4.0s)
  ✓  24 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (3.0s)
  ✓   7 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (15.5s)
  ✓   5 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (17.8s)
  ✓  26 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.5s)
  ✓  28 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.8s)
  ✓  27 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (13.8s)
  ✓  29 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (8.9s)
  ✓  30 [smoke] › tests/smoke/feed.spec.ts:128:5 › my posts, public profile and leaderboard pages render (2.9s)

  30 passed (37.3s)
```
Vitest in the same run: `Test Files  15 passed (15) Tests  100 passed (100)`

Acceptance evidence:
- **Weighting unit test on seeded posts:** `tests/rls/l7-crowd.test.ts` runs the real `private.refresh_crowd_snapshots()` on posts seeded at a fixed 2020 instant. One fresh official alone → avg 5, **medium**. The mixed venue (official ×3, at-venue ×2, 45-min-old ×0.6, 75-min-old pulse ×0.3) → avg 19.4/5.9 = 3.29, **high**, post_count 3 / official 1 / at-venue 1; > 90-min, shadowbanned and pending posts excluded. Weighted vibe 20.8/5.6. A lone 50-min check-in → **low**. Re-running the bucket upserts (1 row).
- **Snapshot function < 2 s on 10k synthetic vendors:** `npm run bench:snapshots` (10,000 published vendors, 30,000 posts in the last 90 min, rolled back afterwards):
```
 bench_vendors 
         10000
 recent_published_posts 
                  30000
         10000
Time: 893.482 ms
         10000
Time: 1290.356 ms (00:01.290)
         10000
Time: 801.882 ms
```
  → 0.89 s / 1.29 s / 0.80 s. (Without fresh statistics inside the bench transaction the planner chose a 53 s plan, because the single synthetic author's profile row had 30k dead versions. In production autovacuum/analyze keeps statistics current; the bench now runs ANALYZE first.)
- **Heat map renders:** smoke `tonight.spec.ts`: after the toggle the GL canvas mounts and the `live-heat` heatmap layer is confirmed loaded.
- **Empty state correct:** Aba shows "Be the first — open a venue and tap to pulse" and the "Vendors: post an official update" CTA (plus a "usually busy around now" line when forecast data exists).
- Also: a pulse → snapshot → venue appears in the live rail with its crowd badge and the hero count; `/api/live/[city]` returns it with `s-maxage=30`; the venue header shows the live crowd badge; the forecast line "Usually packed around 11pm on …days" appears (rows with sample_size < 4 are ignored).

### Stage L8 — 2026-10-07
```
  ✓   2 [smoke] › tests/smoke/admin-mfa.spec.ts:21:5 › admin without MFA is redirected to enrol, and gets in after verifying a TOTP code (3.1s)
  ✓   6 [smoke] › tests/smoke/directory.spec.ts:19:5 › category chip, area and price filters narrow the list (2.6s)
  ✓   9 [smoke] › tests/smoke/directory.spec.ts:45:5 › unknown city and unpublished vendor return 404 (274ms)
  ✓   7 [smoke] › tests/smoke/auth.spec.ts:36:5 › signup → verify → login (2.9s)
  ✓  11 [smoke] › tests/smoke/auth.spec.ts:75:5 › used or invalid links land on login with a clear message (253ms)
  ✓   8 [smoke] › tests/smoke/admin-mfa.spec.ts:42:5 › non-staff users get a 404 for admin pages (1.5s)
  ✓  12 [smoke] › tests/smoke/auth.spec.ts:81:5 › open redirects are refused after login (1.1s)
  ✓  10 [smoke] › tests/smoke/directory.spec.ts:50:5 › map loads only when toggled (1.9s)
  ✓  15 [smoke] › tests/smoke/directory.spec.ts:70:5 › vendor page: header, prices, hours, deep links and share (274ms)
  ✓  16 [smoke] › tests/smoke/directory.spec.ts:96:5 › search finds venues by partial name, with typeahead (1.2s)
  ✓  17 [smoke] › tests/smoke/directory.spec.ts:105:5 › sitemap lists cities and vendors; OG image renders (345ms)
  ✓  14 [smoke] › tests/smoke/auth.spec.ts:93:5 › password reset: recovery link → choose new password → sign in with it (2.5s)
  ✓  19 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.2s)
  ✓  18 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (4.7s)
  ✓  21 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer (274ms)
  ✓  22 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (375ms)
  ✓  20 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.6s)
  ✓  23 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (3.1s)
  ✓  24 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (2.6s)
  ✓  25 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.9s)
  ✓  27 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (167ms)
  ✓  13 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (17.7s)
  ✓  26 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (12.3s)
  ✓  29 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (7.1s)
  ✓  30 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (5.2s)
  ✓  28 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (20.0s)
  ✓  32 [smoke] › tests/smoke/feed.spec.ts:128:5 › my posts, public profile and leaderboard pages render (4.6s)
  ✓  31 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (9.3s)

  32 passed (53.8s)
```
Vitest in the same run: `Test Files  18 passed (18) Tests  115 passed (115)`

Acceptance evidence (`tests/rls/l8-moderation.test.ts` runs REAL OpenAI moderation against DEV; `l8-borderline.test.ts` mocks the provider to control scores):
- **Harmful text auto-hidden:** a threatening note (test text avoids slurs; it is a violent threat, provider max score 0.95) → `hidden`, `auto_block`, P1 queue item, invisible to anon, still visible to its author. Admin blocklist phrases also auto-block without calling the provider.
- **Borderline publishes + queued:** score 0.62 → `published`, `auto_flag`, P2 queue item. If the provider is unavailable the post is still flagged, never silently passed.
- **New-account photo held:** L6 test + L8 approval test (pending / `media_new_account`, P2 hold item, 0 points). On moderator approval → published, points awarded, trust +2.
- **Pulse never held:** a pulse from a brand-new, trust-0 account publishes immediately.
- **3 reports hide:** three users report "fake" → `hidden`, report_count 3, P1 `user_report` item. Moderator "remove + warn" → trust −25 (fake), status `warned`, reports `resolved_removed`, items closed, audit row with actor and reason.
- **Shadowban RLS proven:** L2 matrix + a moderator shadowban action here: the author still sees their post, anon doesn't.
- **Thresholds unit-tested:** `tests/unit/moderation-decide.test.ts`; trust maths, blocklist matching and fail-safe in `tests/unit/moderation-text.test.ts`.
- Also: more than 3 posts in 10 minutes escalates to P1; removing without a reason is refused; smoke `moderation.spec.ts`: a moderator with MFA approves a held post from `/admin/moderation?source=hold` and it goes live; the guidelines link resolves.

### Stage L9 — 2026-10-07
```
  ✓  10 [smoke] › tests/smoke/auth.spec.ts:75:5 › used or invalid links land on login with a clear message (268ms)
  ✓   8 [smoke] › tests/smoke/admin-mfa.spec.ts:42:5 › non-staff users get a 404 for admin pages (1.4s)
  ✓  12 [smoke] › tests/smoke/auth.spec.ts:81:5 › open redirects are refused after login (1.1s)
  ✓  13 [smoke] › tests/smoke/events.spec.ts:51:5 › 200 events render smoothly in the list and month views (781ms)
  ✓  11 [smoke] › tests/smoke/directory.spec.ts:50:5 › map loads only when toggled (2.0s)
  ✓  15 [smoke] › tests/smoke/events.spec.ts:73:5 › December in Nigeria page shows the countdown before the season (338ms)
  ✓  16 [smoke] › tests/smoke/directory.spec.ts:70:5 › vendor page: header, prices, hours, deep links and share (243ms)
  ✓  17 [smoke] › tests/smoke/events.spec.ts:79:5 › event page: venue card, external ticket link, share, valid .ics (501ms)
  ✓  18 [smoke] › tests/smoke/directory.spec.ts:96:5 › search finds venues by partial name, with typeahead (767ms)
  ✓  20 [smoke] › tests/smoke/directory.spec.ts:105:5 › sitemap lists cities and vendors; OG image renders (442ms)
  ✓  14 [smoke] › tests/smoke/auth.spec.ts:93:5 › password reset: recovery link → choose new password → sign in with it (2.6s)
  ✓  22 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (4.6s)
  ✓  23 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer (268ms)
  ✓  19 [smoke] › tests/smoke/events.spec.ts:99:5 › submit an event → admin approves → it is public (7.7s)
  ✓  24 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.1s)
  ✓  25 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (467ms)
  ✓  27 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (3.6s)
  ✓  26 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.2s)
  ✓  28 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.9s)
  ✓  30 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (174ms)
  ✓  29 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (2.7s)
  ✓  21 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (17.2s)
  ✓  31 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (15.5s)
  ✓  33 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (7.8s)
  ✓  32 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (20.5s)
  ✓  34 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (5.0s)
  ✓  35 [smoke] › tests/smoke/feed.spec.ts:128:5 › my posts, public profile and leaderboard pages render (5.2s)
  ✓  36 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (8.5s)

  36 passed (1.0m)
```
Vitest in the same run: `Test Files  20 passed (20) Tests  125 passed (125)`

Acceptance evidence:
- **Season trigger correct:** `tests/rls/l9-events.test.ts`, exact Lagos-midnight boundaries: 14 Nov 23:30 WAT → false, 15 Nov 00:30 WAT → true, 10 Jan 23:00 WAT → true, 11 Jan 00:30 WAT → false. Moving an event re-flags it, and changing the season dates in `platform_settings` re-flags existing events (both directions).
- **iCal valid:** `tests/unit/ical.test.ts` runs a structural RFC 5545 validator (CRLF endings, ≤ 75-octet folded lines including multi-byte ₦, balanced BEGIN/END, VEVENT has UID / DTSTAMP / UTC DTSTART / SUMMARY, TEXT escaping). The smoke test also checks the served `.ics` (content-type `text/calendar`) and the city feed (≥ 200 VEVENTs).
- **200 events render smoothly:** smoke `events.spec.ts`: 200 published events in Owerri; `/events?city=owerri` loads with all 200 cards in **652 ms** and scrolls to the end in **25 ms** (cards use `content-visibility: auto`). The month grid renders.
- Also: `/events/december` countdown before 15 Nov; event page with venue card, external ticket link (`rel=nofollow noopener`), share, add-to-calendar; submit → pending (404 publicly) → admin (MFA) approves → public. Approve / reject (reason required) is audited.

### Stage L10 — 2026-10-07
```
  ✓   3 [smoke] › tests/smoke/content.spec.ts:36:5 › paste markdown → preview → publish → live page, sitemap and valid JSON-LD (8.2s)
  ✓  14 [smoke] › tests/smoke/content.spec.ts:95:5 › toolkit index and guides index render (204ms)
  ✓  12 [smoke] › tests/smoke/directory.spec.ts:19:5 › category chip, area and price filters narrow the list (2.8s)
  ✓  13 [smoke] › tests/smoke/events.spec.ts:51:5 › 200 events render smoothly in the list and month views (785ms)
  ✓  16 [smoke] › tests/smoke/directory.spec.ts:45:5 › unknown city and unpublished vendor return 404 (269ms)
  ✓  17 [smoke] › tests/smoke/events.spec.ts:73:5 › December in Nigeria page shows the countdown before the season (296ms)
  ✓  19 [smoke] › tests/smoke/events.spec.ts:79:5 › event page: venue card, external ticket link, share, valid .ics (336ms)
  ✓  18 [smoke] › tests/smoke/directory.spec.ts:50:5 › map loads only when toggled (1.9s)
  ✓  21 [smoke] › tests/smoke/directory.spec.ts:70:5 › vendor page: header, prices, hours, deep links and share (243ms)
  ✓  22 [smoke] › tests/smoke/directory.spec.ts:96:5 › search finds venues by partial name, with typeahead (1.1s)
  ✓  23 [smoke] › tests/smoke/directory.spec.ts:105:5 › sitemap lists cities and vendors; OG image renders (336ms)
  ✓  24 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (3.7s)
  ✓  20 [smoke] › tests/smoke/events.spec.ts:99:5 › submit an event → admin approves → it is public (7.2s)
  ✓  25 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer (246ms)
  ✓  27 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (359ms)
  ✓  26 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.1s)
  ✓  28 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (2.9s)
  ✓  30 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.7s)
  ✓  31 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (180ms)
  ✓  29 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.7s)
  ✓  15 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (17.4s)
  ✓  33 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (2.5s)
  ✓  32 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (11.3s)
  ✓  35 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (7.0s)
  ✓  34 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (19.8s)
  ✓  36 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (5.0s)
  ✓  37 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (4.6s)
  ✓  38 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (9.4s)

  38 passed (59.0s)
```
Vitest in the same run: `Test Files  22 passed (22) Tests  132 passed (132)`

Acceptance evidence:
- **Paste markdown → preview → publish → in sitemap with valid JSON-LD:** smoke `content.spec.ts`. An admin with MFA pastes markdown (headings, bold, link, `<Callout>`, `<VendorCard>`, `<PriceTable>`, a list and a `<script>` tag) into `/admin/content/new`. The live preview renders it, shows embed placeholders and escapes the script (no `<script>` element). Saved as a draft → public URL 404 → the signed draft-preview link works (a forged token gives 404) → Publish → `/guides/lagos/<slug>` renders the h1, "Last updated", callout, venue card and price table (₦10,000), with no script in the body. JSON-LD parses: `@type: Article`, headline, valid `datePublished`/`dateModified`, Organization publisher, `mainEntityOfPage`, and `about` → `TouristAttraction` for the embedded venue. The URL appears in `/sitemap.xml`. The city hub's Nightlife tab lists it.
- Markdown security: `tests/unit/markdown.test.ts` (10 XSS vectors: script, onerror, javascript: / data: / protocol-relative links, iframe, svg onload…; allowlist sanitizer; custom-tag parsing, including rejection of malformed slugs). Preview tokens: `tests/unit/preview-token.test.ts` (expiry, wrong guide, tampering).
- Regression fixed and re-measured: once real image moderation was in the photo request (L8), the L6 "no request > 5 s" check failed under parallel load. Moderation now runs alongside the upload and WebP encoding is faster: the slowest of 4 photo requests is **3,377 ms** end-to-end (server-side 1.8–3.3 s, mostly laptop ↔ London storage transfer; Vercel `lhr1` sits next to Supabase London).

### Stage L11 — 2026-10-07
```
  ✓  13 [smoke] › tests/smoke/events.spec.ts:51:5 › 200 events render smoothly in the list and month views (817ms)
  ✓  17 [smoke] › tests/smoke/events.spec.ts:73:5 › December in Nigeria page shows the countdown before the season (274ms)
  ✓  16 [smoke] › tests/smoke/content.spec.ts:95:5 › toolkit index and guides index render (319ms)
  ✓  18 [smoke] › tests/smoke/events.spec.ts:79:5 › event page: venue card, external ticket link, share, valid .ics (345ms)
  ✓  15 [smoke] › tests/smoke/directory.spec.ts:50:5 › map loads only when toggled (2.0s)
  ✓  21 [smoke] › tests/smoke/directory.spec.ts:70:5 › vendor page: header, prices, hours, deep links and share (288ms)
  ✓  22 [smoke] › tests/smoke/directory.spec.ts:96:5 › search finds venues by partial name, with typeahead (1.6s)
  ✓  23 [smoke] › tests/smoke/directory.spec.ts:105:5 › sitemap lists cities and vendors; OG image renders (388ms)
  ✓  24 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (5.6s)
  ✓  25 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer (233ms)
  ✓  20 [smoke] › tests/smoke/events.spec.ts:99:5 › submit an event → admin approves → it is public (9.3s)
  ✓  26 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status (671ms)
  ✓  27 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.2s)
  ✓  28 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (3.8s)
  ✓  30 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (453ms)
  ✓  31 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (554ms)
  ✓  29 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (3.8s)
  ✓  19 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (18.2s)
  ✓  32 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (3.2s)
  ✓  33 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (2.6s)
  ✓  35 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.8s)
  ✓  37 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (173ms)
  ✓  36 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (12.8s)
  ✓  34 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (15.6s)
  ✓  38 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (6.0s)
  ✓  39 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (4.1s)
  ✓  40 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.8s)
  ✓  41 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (7.3s)

  41 passed (1.0m)
```
Vitest in the same run: `Test Files  24 passed (24) Tests  141 passed (141)`

Acceptance evidence:
- **Issue report invisible to every non-admin role:** `tests/rls/l11-issue-reports.test.ts`. A report created server-side exists, yet anon, user, vendor_member, moderator, admin and super_admin API sessions all get `PGRST106` on the table and permission errors on the list / create / update RPCs. Admins only ever see reports through the server-rendered `/admin/issues` (admin + aal2). Smoke: an anonymous report doesn't appear on `/safety/lagos`, `/`, `/c/lagos` or `/events`, and does appear in admin triage.
- **No "authorities will act"-type copy:** `tests/unit/content-rules.test.ts` greps app / components / lib / content / supabase for authority-action promises. `tests/unit/safety-copy.test.ts` pins the exact §10 confirmation text and checks that no incident-feed or report-map route exists and that report reads happen only in admin code.
- **Numbers render per city:** smoke `safety.spec.ts`: Lagos shows national 112 / FRSC 122 + LASEMA 767 (tap-to-call `tel:767`); Abuja shows the national numbers without LASEMA; every block shows "Last verified".
- Also: the exact confirmation copy after submitting; honeypot submissions get the same response and are not stored.

### Stage L12 — 2026-10-07
```
  ✓  18 [smoke] › tests/smoke/directory.spec.ts:70:5 › vendor page: header, prices, hours, deep links and share (236ms)
  ✓  19 [smoke] › tests/smoke/content.spec.ts:95:5 › toolkit index and guides index render (233ms)
  ✓  20 [smoke] › tests/smoke/directory.spec.ts:96:5 › search finds venues by partial name, with typeahead (614ms)
  ✓  22 [smoke] › tests/smoke/directory.spec.ts:105:5 › sitemap lists cities and vendors; OG image renders (300ms)
  ✓  15 [smoke] › tests/smoke/admin-backoffice.spec.ts:62:5 › admin: vendor table filters + posts bulk hide needs a reason (4.8s)
  ✓  21 [smoke] › tests/smoke/events.spec.ts:51:5 › 200 events render smoothly in the list and month views (680ms)
  ✓  25 [smoke] › tests/smoke/events.spec.ts:73:5 › December in Nigeria page shows the countdown before the season (325ms)
  ✓  26 [smoke] › tests/smoke/events.spec.ts:79:5 › event page: venue card, external ticket link, share, valid .ics (353ms)
  ✓  24 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (4.6s)
  ✓  28 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer (242ms)
  ✓  29 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status (373ms)
  ✓  27 [smoke] › tests/smoke/events.spec.ts:99:5 › submit an event → admin approves → it is public (6.9s)
  ✓  30 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (4.2s)
  ✓  32 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (436ms)
  ✓  31 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.2s)
  ✓  33 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (807ms)
  ✓  34 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (5.1s)
  ✓  35 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (3.9s)
  ✓  23 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (17.8s)
  ✓  37 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.9s)
  ✓  39 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (158ms)
  ✓  36 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (3.4s)
  ✓  40 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (13.0s)
  ✓  38 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (18.6s)
  ✓  41 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (10.1s)
  ✓  43 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (3.4s)
  ✓  42 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (7.2s)
  ✓  44 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (7.4s)

  44 passed (1.2m)
```
Vitest in the same run: `Test Files  26 passed (26) Tests  160 passed (160)`

Acceptance evidence:
- **Moderator can't open settings:** smoke `admin-backoffice.spec.ts`: a moderator with MFA gets a 404 on `/admin/settings` and on `/admin/export/users`, and the Settings link isn't in their nav. Service level: `updateSettings` throws for an admin and succeeds (audited) for a super_admin (`tests/rls/l12-backoffice.test.ts`).
- **User CSV export is super_admin only and audited:** an admin gets a 404 from the route and `forbidden` from the service with no audit row. A super_admin gets `text/csv` containing the filtered users' emails, and exactly one `export.users` audit row is written. IPs are never in the export.
- **Digest renders:** `buildDigest()` + `DailyDigestEmail` render to HTML with the counts. The cron route rejects requests without, or with the wrong, `Bearer CRON_SECRET`.
- **Filters work:** vendor table `no_prices` / `never_posted` / search (service test + smoke with `?tab=all&no_prices=1`); user table role filter (smoke); vendor CSV export honours the same filters.
- **Destructive actions need a reason and are audited:** suspend user, bulk post hide, suspend vendor, settings change and blocklist add all reject empty reasons (ZodError, nothing written) and write `user.*` / `post.bulk_*` / `vendor.*` / `settings.updated` / `blocklist.phrase_added` audit rows. Smoke: bulk hide without a selection or reason shows an error.
- **Live activity stream:** smoke: a new signup appears on the moderator's dashboard stream without reload; pause shows "Resume". A normal user is refused on the private `admin:activity` channel (`CHANNEL_ERROR`) and can't select `activity_events`.

### Stage L13 — 2026-10-07
```
  ✓  21 [smoke] › tests/smoke/directory.spec.ts:96:5 › search finds venues by partial name, with typeahead (1.1s)
  ✓  22 [smoke] › tests/smoke/directory.spec.ts:105:5 › sitemap lists cities and vendors; OG image renders (359ms)
  ✓  19 [smoke] › tests/smoke/events.spec.ts:51:5 › 200 events render smoothly in the list and month views (790ms)
  ✓  25 [smoke] › tests/smoke/events.spec.ts:73:5 › December in Nigeria page shows the countdown before the season (287ms)
  ✓  26 [smoke] › tests/smoke/events.spec.ts:79:5 › event page: venue card, external ticket link, share, valid .ics (346ms)
  ✓  24 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (4.8s)
  ✓  28 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer (264ms)
  ✓  29 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status (473ms)
  ✓  27 [smoke] › tests/smoke/events.spec.ts:99:5 › submit an event → admin approves → it is public (8.5s)
  ✓  30 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (3.8s)
  ✓  32 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (447ms)
  ✓  33 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (3.1s)
  ✓  23 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (17.7s)
  ✓  34 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (3.3s)
  ✓  31 [smoke] › tests/smoke/security.spec.ts:5:5 › CSP is enforced and key pages (incl. the map) raise no violations (8.1s)
  ✓  37 [smoke] › tests/smoke/security.spec.ts:35:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice (331ms)
  ✓  38 [smoke] › tests/smoke/security.spec.ts:52:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights (136ms)
  ✓  39 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (506ms)
  ✓  36 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (4.1s)
  ✓  40 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (4.3s)
  ✓  42 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.8s)
  ✓  43 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (175ms)
  ✓  35 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (16.2s)
  ✓  41 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (12.7s)
  ✓  44 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (5.0s)
  ✓  45 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (5.2s)
  ✓  46 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.7s)
  ✓  47 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (7.6s)

  47 passed (1.2m)
```
Vitest in the same run: `Test Files  30 passed (30) Tests  201 passed (201)`

Acceptance evidence:
- **CSP enforced:** `Content-Security-Policy` (no Report-Only, no `unsafe-eval`, `frame-ancestors 'none'`, `upgrade-insecure-requests`, report-uri → Sentry). Smoke `security.spec.ts` checks 7 key pages plus an opened Mapbox map and finds zero `securitypolicyviolation` events. A manual trace over 16 public pages was also clean.
- **Rate limits tested:** `tests/rls/l13-security.test.ts` against real Upstash: reportUser 10/h then refused, postUser 6/h override, per-user keys independent, and end-to-end a third pulse on the same venue within 30 min throws `PostError`. `tests/unit/rate-limit-config.test.ts` pins every §7.5 number and checks that IP limits are ≥ 10× the per-user limits.
- **Service-role isolation:** existing source tests plus a new scan of every built file under `.next/static` for any secret value from `.env.local` and for `sb_secret_` key material: none.
- **Signed URL expiry:** a verification doc has no public URL; a 2-second signed link returns 200, then fails after expiry.
- **Audit immutability:** `tests/sql/audit-immutability.sql`: UPDATE / DELETE / TRUNCATE on `private.audit_log` are refused with 42501 for **postgres (owner) and service_role**. The Data API can't reach it either.
- **Purge jobs:** `tests/sql/purges.sql` runs `private.run_daily_purges()` on fixtures in a rolled-back transaction. Abandoned check-in → removed; a deleted account after 24 h → anonymised, IP/UA cleared, posts emptied; a decided verification request without files → marked purged; one with files is **not** marked purged while the Vault secrets are missing (open question 4); a 71-day snapshot → deleted; the run is audited.
- **npm audit:** `npm audit --omit=dev` → 0. The dev tree is unchanged in kind (open question 1, now also a moderate in `postcss-selector-parser` via Tailwind 3).
- **Privacy / terms:** rewritten (see notes); smoke checks the cookie, processor, retention and rights sections.
- **Cookie consent (analytics only):** smoke: the banner shows on first visit, "Essential only" is remembered (cookie), "Cookie settings" in the footer reopens it, and "Allow analytics" stores consent. Analytics and Speed Insights don't mount without consent.
- **Sentry scrub:** existing tests plus new wiring checks: `beforeSend` / `beforeSendSpan` / `beforeBreadcrumb` = scrubber, `sendDefaultPii` false, 10 % tracing, logs off, no Replay/profiling anywhere. A realistic event leaks no email, IPv4/IPv6 or key.
- **RLS matrix:** `tests/rls/matrix.test.ts` + `tests/sql/rls-matrix.sql`: 9 roles (anon, user, vendor owner, moderator/admin/super_admin with and without MFA) × all 26 public relations × select/update/delete, impersonated exactly like PostgREST (role + JWT incl. `aal`) and rolled back. Asserts: RLS + policies on every table, views run as invoker, an exact set of API write grants, anon writes nothing, a user can update only their own profile, **staff without MFA are identical to plain users**, owners touch only their own vendor/prices, and staff with MFA see more but still write nothing directly. Catalog checks: no API access to `private`, admin RPCs or activity partitions.
- **Weekly backup:** `/api/cron/backup` (Sunday 03:00 UTC) → gzipped NDJSON of every public + private table into the private `backups` bucket, 8-week pruning, audited. Tested end-to-end, including the private bucket and the RPC lock-down.

### Stage L14 — 2026-10-07
```
  ✓  28 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer (256ms)
  ✓  29 [smoke] › tests/smoke/pwa.spec.ts:5:5 › PWA: a guide read online opens offline; other pages fall back to /offline listing saved guides (402ms)
  ✓  30 [smoke] › tests/smoke/pwa.spec.ts:29:5 › PWA: the service worker never caches signed-in or admin pages (8ms)
  ✓  31 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status (335ms)
  ✓  26 [smoke] › tests/smoke/events.spec.ts:99:5 › submit an event → admin approves → it is public (9.7s)
  ✓  32 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (3.9s)
  ✓  34 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (444ms)
  ✓  35 [smoke] › tests/smoke/seo.spec.ts:11:5 › robots.txt blocks private areas and points at the sitemap (10ms)
  ✓  36 [smoke] › tests/smoke/seo.spec.ts:17:5 › sitemap lists cities, venues, guides and safety pages (43ms)
  ✓  37 [smoke] › tests/smoke/seo.spec.ts:22:5 › home: canonical + WebSite search action + Organization (130ms)
  ✓  38 [smoke] › tests/smoke/seo.spec.ts:29:5 › venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings (457ms)
  ✓  39 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (1.6s)
  ✓  33 [smoke] › tests/smoke/security.spec.ts:5:5 › CSP is enforced and key pages (incl. the map) raise no violations (7.9s)
  ✓  41 [smoke] › tests/smoke/security.spec.ts:35:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice (300ms)
  ✓  42 [smoke] › tests/smoke/security.spec.ts:52:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights (154ms)
  ✓  23 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (18.6s)
  ✓  40 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.2s)
  ✓  43 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (526ms)
  ✓  46 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (5.9s)
  ✓  45 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (6.2s)
  ✓  47 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (2.0s)
  ✓  49 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (156ms)
  ✓  44 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (22.2s)
  ✓  48 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (15.7s)
  ✓  50 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (4.3s)
  ✓  51 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (6.3s)
  ✓  52 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (3.4s)
  ✓  53 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (8.3s)

  53 passed (1.3m)
```
Vitest in the same run: `Test Files  33 passed (33) Tests  217 passed (217)`

Acceptance evidence — **Lighthouse mobile** (`npx lighthouse@12`, default mobile emulation with simulated slow 4G + 4× CPU, local production build, first visit so the cookie banner shows; 3 runs each):

| Page | Performance | Accessibility | Best practices | SEO | LCP / TBT / CLS |
|---|---|---|---|---|---|
| Home `/` | 92 · 93 · 93 | 100 | 96* | 100 | 3.2–3.3 s / 10 ms / 0 |
| City `/c/lagos` | 91 · 91 · 91 | 100 | 96* | 100 | 3.5 s / 10–20 ms / 0.001 |
| Vendor `/v/…` (map closed) | 92 · 92 · 92 | 100 | 100 | 100 | 3.2 s / 10 ms / 0.005 |
| Guide `/guides/lagos/…` | 93 · 93 · 93 | 100 | 100 | 100 | 3.2 s / 10 ms / 0 |

\*Local-only: a prefetch of `/vendor` was redirected to `https://localhost` by `upgrade-insecure-requests`. Those links no longer prefetch (they lead to a login redirect anyway). In the real browser with the same throttling, LCP = FCP ≈ 0.35–0.42 s on all four pages; Lighthouse's simulated LCP counts every script requested before first paint.

Other evidence: `seo.spec.ts` (robots, sitemap, canonical, WebSite/Organization and LocalBusiness/BreadcrumbList JSON-LD, no ratings); `pwa.spec.ts` (a guide read online opens offline; uncached pages redirect to `/offline`, which lists saved guides; SW headers and exclusions); `tests/rls/l14-api.test.ts` (8 API tests: envelope, CORS, filters, 400/401/403/404, writes via Bearer token through RLS); `tests/unit/blur-jsonld.test.ts`, `tests/unit/analytics.test.ts`.

### Stage L15 — 2026-10-07
```
  ✓  28 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer @readonly (233ms)
  ✓  29 [smoke] › tests/smoke/pwa.spec.ts:5:5 › PWA: a guide read online opens offline; other pages fall back to /offline listing saved guides @readonly (382ms)
  ✓  30 [smoke] › tests/smoke/pwa.spec.ts:29:5 › PWA: the service worker never caches signed-in or admin pages @readonly (6ms)
  ✓  31 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status @readonly (1.0s)
  ✓  25 [smoke] › tests/smoke/events.spec.ts:99:5 › submit an event → admin approves → it is public (8.6s)
  ✓  32 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (4.5s)
  ✓  34 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (792ms)
  ✓  35 [smoke] › tests/smoke/seo.spec.ts:11:5 › robots.txt blocks private areas and points at the sitemap @readonly (13ms)
  ✓  36 [smoke] › tests/smoke/seo.spec.ts:17:5 › sitemap lists cities, venues, guides and safety pages @readonly (67ms)
  ✓  37 [smoke] › tests/smoke/seo.spec.ts:22:5 › home: canonical + WebSite search action + Organization @readonly (147ms)
  ✓  38 [smoke] › tests/smoke/seo.spec.ts:29:5 › venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings @readonly (571ms)
  ✓  39 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (3.3s)
  ✓  33 [smoke] › tests/smoke/security.spec.ts:7:5 › CSP is enforced and key pages (incl. the map) raise no violations @readonly (9.1s)
  ✓  41 [smoke] › tests/smoke/security.spec.ts:40:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice @readonly (294ms)
  ✓  42 [smoke] › tests/smoke/security.spec.ts:57:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights @readonly (124ms)
  ✓  24 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (19.6s)
  ✓  43 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (458ms)
  ✓  40 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.5s)
  ✓  45 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (4.4s)
  ✓  46 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (4.0s)
  ✓  47 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (2.1s)
  ✓  49 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (140ms)
  ✓  44 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (15.8s)
  ✓  48 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (12.2s)
  ✓  50 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (4.4s)
  ✓  51 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.8s)
  ✓  52 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.9s)
  ✓  53 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (6.9s)

  53 passed (1.2m)
```
Vitest in the same run: `Test Files  36 passed (36) Tests  227 passed (227)`

Acceptance evidence:
- **Smoke (signup, onboard, approve, official update, pulse, check-in, moderate, share):** all green in the run above (53 tests), against a production build on DEV: `auth.spec` signup → verify → login, `vendor.spec` onboarding in under 10 minutes, admin approval, official update in two taps and the claim flow, `feed.spec` pulse (Realtime ≤ 2 s) and the 4-photo check-in, `moderation.spec` held post approved, `directory.spec`/`events.spec` share links and .ics. **On the Vercel Preview:** the L14 preview built successfully on Vercel, but it sits behind Vercel Authentication (302 → SSO), so automated tests need a bypass secret that isn't in `.env.local` (**open question 9**). `tests/smoke/global-setup.ts` is ready for it, so one command runs the whole suite there.
- **Read-only PROD smoke:** 15 tests tagged `@readonly` (`npm run smoke:readonly`, or `--grep @readonly` with `PLAYWRIGHT_BASE_URL`). They create no data and skip what needs venues: 15/15 green locally.
- **Content loader:** `tests/rls/l15-content-loader.test.ts`: one bad row stops the whole load (nothing written, `file:line — reason`); the examples load venues (hours syntax, features, cover image through the image pipeline), prices, events (venue-local time → UTC), guides and dated safety entries, with an audit entry; re-runs are idempotent; claimed venues are never overwritten. `tests/unit/content-parsers.test.ts` covers front matter, CSV and hours syntax. `npm run content:check -- --dir=content/_examples` → all 7 example files valid.
- **LAUNCH.md complete:** ordered runbook A–H (accounts, DB promotion, Auth, keys, Vercel env, deploy + super admin + content, DNS, smoke) plus a known-limitations list. `tests/unit/launch-docs.test.ts` guards the PRD-required items.
- **All L stages ticked with evidence:** L1–L15 above.

### Stage P1 — 2026-10-07
```
  ✓  29 [smoke] › tests/smoke/pwa.spec.ts:5:5 › PWA: a guide read online opens offline; other pages fall back to /offline listing saved guides @readonly (370ms)
  ✓  30 [smoke] › tests/smoke/pwa.spec.ts:29:5 › PWA: the service worker never caches signed-in or admin pages @readonly (6ms)
  ✓  28 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (4.1s)
  ✓  31 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status @readonly (348ms)
  ✓  32 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer @readonly (263ms)
  ✓  33 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (3.9s)
  ✓  35 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (427ms)
  ✓  36 [smoke] › tests/smoke/seo.spec.ts:11:5 › robots.txt blocks private areas and points at the sitemap @readonly (8ms)
  ✓  37 [smoke] › tests/smoke/seo.spec.ts:17:5 › sitemap lists cities, venues, guides and safety pages @readonly (60ms)
  ✓  38 [smoke] › tests/smoke/seo.spec.ts:22:5 › home: canonical + WebSite search action + Organization @readonly (137ms)
  ✓  39 [smoke] › tests/smoke/seo.spec.ts:29:5 › venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings @readonly (450ms)
  ✓  40 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (1.8s)
  ✓  34 [smoke] › tests/smoke/security.spec.ts:7:5 › CSP is enforced and key pages (incl. the map) raise no violations @readonly (8.0s)
  ✓  42 [smoke] › tests/smoke/security.spec.ts:40:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice @readonly (289ms)
  ✓  43 [smoke] › tests/smoke/security.spec.ts:57:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights @readonly (126ms)
  ✓  44 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (313ms)
  ✓  41 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (3.8s)
  ✓  27 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (20.4s)
  ✓  45 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (3.7s)
  ✓  46 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (3.3s)
  ✓  48 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (2.0s)
  ✓  50 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (172ms)
  ✓  49 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (13.9s)
  ✓  47 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (16.3s)
  ✓  51 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (5.6s)
  ✓  52 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (4.3s)
  ✓  53 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (3.3s)
  ✓  54 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (8.3s)

  54 passed (1.3m)
```
Vitest in the same run: `Test Files  37 passed (37) Tests  238 passed (238)`

Acceptance evidence (`tests/rls/p1-agent-api.test.ts`, 10 tests, plus smoke `admin-backoffice.spec.ts` "super admin creates an agent key…"):
- **Valid key → summary:** 200 with the `{ data, error, meta }` envelope (KPIs, moderation, daily series), `Cache-Control: no-store`.
- **Revoked / expired / wrong-IP → 401 / 403:** missing → `401 missing_key`; unknown → `401 invalid_key`; revoked → `401 key_revoked`; expired → `401 key_expired`; IP outside the allowlist (`203.0.113.0/24`) → `403 ip_not_allowed`; an IP inside it → 200. In the browser: create in Settings → key shown once → works → never shown again after reload → revoke → 401.
- **Scope enforcement:** a `read` key POSTing `/tasks` or `/notes` → `403 insufficient_scope`; `tasks:write` creates the task attributed to the key's owner; `notes:write` adds an append-only note (audit `actor_role = agent`); `/issues` needs `pii:read`; `/users/{id}` and `/search` hide email without `pii:read` and show it with it. Vendor detail never exposes verification documents. Only a super admin can create keys.
- **openapi.json validates:** OpenAPI 3.1.0, one operation per registry endpoint, unique operationIds, declared path parameters, every `$ref` resolves, an `apiKey` security scheme on `X-Agent-Key`, and **a route file exists for every documented path**.
- **Audit:** every authenticated call (including refusals for known keys) writes `agent.get` / `agent.post` with `actor_role = 'agent'`, the key id, path, query and status.

### Stage P2 — 2026-10-07
```
  ✓  31 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer @readonly (243ms)
  ✓  32 [smoke] › tests/smoke/pwa.spec.ts:5:5 › PWA: a guide read online opens offline; other pages fall back to /offline listing saved guides @readonly (373ms)
  ✓  33 [smoke] › tests/smoke/pwa.spec.ts:29:5 › PWA: the service worker never caches signed-in or admin pages @readonly (6ms)
  ✓  29 [smoke] › tests/smoke/lists.spec.ts:16:5 › plan my night: add from a venue → make public → share link renders logged-out (map, cost, WhatsApp, OG) (6.5s)
  ✓  34 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status @readonly (409ms)
  ✓  36 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (3.9s)
  ✓  37 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (652ms)
  ✓  38 [smoke] › tests/smoke/seo.spec.ts:11:5 › robots.txt blocks private areas and points at the sitemap @readonly (9ms)
  ✓  27 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (17.6s)
  ✓  39 [smoke] › tests/smoke/seo.spec.ts:17:5 › sitemap lists cities, venues, guides and safety pages @readonly (82ms)
  ✓  41 [smoke] › tests/smoke/seo.spec.ts:22:5 › home: canonical + WebSite search action + Organization @readonly (130ms)
  ✓  42 [smoke] › tests/smoke/seo.spec.ts:29:5 › venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings @readonly (376ms)
  ✓  43 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.6s)
  ✓  35 [smoke] › tests/smoke/security.spec.ts:7:5 › CSP is enforced and key pages (incl. the map) raise no violations @readonly (8.0s)
  ✓  45 [smoke] › tests/smoke/security.spec.ts:40:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice @readonly (321ms)
  ✓  46 [smoke] › tests/smoke/security.spec.ts:57:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights @readonly (129ms)
  ✓  47 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (478ms)
  ✓  44 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.7s)
  ✓  48 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (5.5s)
  ✓  50 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.8s)
  ✓  49 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (4.0s)
  ✓  51 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (162ms)
  ✓  40 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (16.3s)
  ✓  53 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (3.6s)
  ✓  52 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (10.5s)
  ✓  54 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.9s)
  ✓  55 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (3.2s)
  ✓  56 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (6.9s)

  56 passed (1.3m)
```
Vitest in the same run: `Test Files  38 passed (38) Tests  246 passed (246)`

Acceptance evidence — **share link renders logged-out:** smoke `lists.spec.ts`. A signed-in user taps "Add to my night" on a city-page card → creates "Smoke night out" in the sheet → `/me/lists` → toggles "Anyone with the link can view" → a fresh logged-out browser opens `/l/<token>` (200): title, the venue, the cost estimate, the WhatsApp share link, `noindex`, and an OG image (PNG). Making it private again → the link returns 404. Visitors who tap "Add to my night" are sent to sign in. `tests/rls/p2-lists.test.ts` (7): RLS (other users and anon can't read or write lists or items), server-generated token (clients can't set it), private → no share data, public → logged-out RPC returns title/owner/items with min/max prices and no owner id or email, per-IP view counting without audit noise, blocked wording refused, the 20-lists limit enforced in the DB, and the cost-estimate maths. Lighthouse after P2: 92 / 91 / 92 / 93 perf, 100 a11y / BP / SEO.

### Stage P3 — 2026-10-07
```
  ✓  30 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (5.2s)
  ✓  34 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer @readonly (241ms)
  ✓  35 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status @readonly (527ms)
  ✓  33 [smoke] › tests/smoke/qa.spec.ts:14:5 › admin writes a pinned seed in /admin/qa → it renders first on the city Q&A page, logged-out, with its official answer (4.9s)
  ✓  27 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (19.2s)
  ✓  36 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (5.1s)
  ✓  39 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (606ms)
  ✓  37 [smoke] › tests/smoke/qa.spec.ts:39:5 › ask on a venue page → moderated → visible; it shows up in /admin/qa (5.5s)
  ✓  41 [smoke] › tests/smoke/seo.spec.ts:11:5 › robots.txt blocks private areas and points at the sitemap @readonly (9ms)
  ✓  42 [smoke] › tests/smoke/seo.spec.ts:17:5 › sitemap lists cities, venues, guides and safety pages @readonly (47ms)
  ✓  43 [smoke] › tests/smoke/seo.spec.ts:22:5 › home: canonical + WebSite search action + Organization @readonly (162ms)
  ✓  44 [smoke] › tests/smoke/seo.spec.ts:29:5 › venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings @readonly (450ms)
  ✓  45 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.6s)
  ✓  40 [smoke] › tests/smoke/security.spec.ts:7:5 › CSP is enforced and key pages (incl. the map) raise no violations @readonly (8.1s)
  ✓  47 [smoke] › tests/smoke/security.spec.ts:40:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice @readonly (303ms)
  ✓  48 [smoke] › tests/smoke/security.spec.ts:57:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights @readonly (130ms)
  ✓  46 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (3.9s)
  ✓  49 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (364ms)
  ✓  50 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (4.6s)
  ✓  38 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (16.9s)
  ✓  51 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (6.6s)
  ✓  54 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.9s)
  ✓  55 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (159ms)
  ✓  53 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (4.0s)
  ✓  52 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (11.7s)
  ✓  56 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.1s)
  ✓  57 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.8s)
  ✓  58 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (7.1s)

  58 passed (1.4m)
```
Vitest in the same run: `Test Files  39 passed (39) Tests  254 passed (254)`

Acceptance evidence:
- **Moderation applies:** `tests/rls/p3-qa.test.ts` (8): a clean question is published and readable logged-out. A question with blocklisted wording is hidden, queued as P1 `auto_block`, invisible to others (visible to its author), and published by a moderator's "approve" from the queue. API callers can't publish, pin or mark answers official. Three reports auto-hide an answer, and the admin "remove" needs a reason and is audited. Shadowbanned askers are hidden from others.
- **Pinned renders:** an admin-written pinned seed renders first with its official, accepted answer (service test). In the browser (`qa.spec.ts`), an admin creates a seed in `/admin/qa` → a logged-out visitor follows "Questions about Lagos?" from the city page → the seed is first, with its Pinned badge and Official answer. A signed-in user asks on a venue page → it's visible after moderation and shows up in `/admin/qa`.
- Also: venue-member answers get the Venue badge; votes count once and never on your own answer; only the asker can accept, and only an answer to their question.

### Stage P4 — 2026-10-08
```
  ✓  31 [smoke] › tests/smoke/moderation.spec.ts:37:5 › moderator (MFA) approves a held post from the queue and it goes live (4.2s)
  ✓  35 [smoke] › tests/smoke/moderation.spec.ts:49:5 › community guidelines are linked from every page footer @readonly (220ms)
  ✓  36 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status @readonly (555ms)
  ✓  27 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (17.9s)
  ✓  37 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (3.8s)
  ✓  34 [smoke] › tests/smoke/qa.spec.ts:14:5 › admin writes a pinned seed in /admin/qa → it renders first on the city Q&A page, logged-out, with its official answer (5.2s)
  ✓  39 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (868ms)
  ✓  40 [smoke] › tests/smoke/qa.spec.ts:39:5 › ask on a venue page → moderated → visible; it shows up in /admin/qa (6.3s)
  ✓  42 [smoke] › tests/smoke/seo.spec.ts:11:5 › robots.txt blocks private areas and points at the sitemap @readonly (22ms)
  ✓  43 [smoke] › tests/smoke/seo.spec.ts:17:5 › sitemap lists cities, venues, guides and safety pages @readonly (51ms)
  ✓  44 [smoke] › tests/smoke/seo.spec.ts:22:5 › home: canonical + WebSite search action + Organization @readonly (139ms)
  ✓  45 [smoke] › tests/smoke/seo.spec.ts:29:5 › venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings @readonly (410ms)
  ✓  46 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (1.7s)
  ✓  41 [smoke] › tests/smoke/security.spec.ts:7:5 › CSP is enforced and key pages (incl. the map) raise no violations @readonly (8.7s)
  ✓  48 [smoke] › tests/smoke/security.spec.ts:40:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice @readonly (295ms)
  ✓  49 [smoke] › tests/smoke/security.spec.ts:57:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights @readonly (134ms)
  ✓  50 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (643ms)
  ✓  38 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (16.4s)
  ✓  47 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (5.4s)
  ✓  51 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (8.9s)
  ✓  54 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (2.3s)
  ✓  55 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (154ms)
  ✓  53 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (7.9s)
  ✓  52 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (8.1s)
  ✓  56 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (9.6s)
  ✓  57 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.2s)
  ✓  58 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.8s)
  ✓  59 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (7.6s)

  59 passed (1.5m)
```
Vitest in the same run: `Test Files  41 passed (41) Tests  261 passed (261)`

Acceptance evidence:
- **Totals correct:** `tests/unit/itinerary-totals.test.ts`: per-day subtotal, running total, trip total, priced/unpriced counts (unpriced stops are counted, never guessed), stops beyond the day count ignored. `tests/rls/p4-itineraries.test.ts`: a saved itinerary with ₦15,000 + ₦3,500 on day 1 and ₦10,000 + an unpriced stop on day 2 → `[18,500 / 18,500]`, `[10,000 / 28,500]`, total ₦28,500, 1 unpriced. Smoke: the CMS editor's live preview shows "Trip total: ₦25,000"; the public page shows day 1 ₦15,000, then on the Day 2 tab ₦10,000 with a running total of ₦25,000.
- **FX toggle works:** unit tests for conversion and formatting (`£31` / `$41` from ₦62,500; `<£1`; Free; only configured currencies offered). Smoke: switching to Pounds shows exactly round(25,000 × `fx_gbp_per_ngn`) and Dollars shows round(25,000 × `fx_usd_per_ngn`), using the live settings values.
- **CMS + JSON-LD:** an admin builds and publishes in `/admin/itineraries` (validated: stops must fit the day count, venue slugs must exist, publishing needs at least one stop; audited). Drafts are invisible publicly (RLS). The page carries `TouristTrip` JSON-LD with an `ItemList` itinerary (+ BreadcrumbList).

### Stage P5 — 2026-10-08
```
  ✓  35 [smoke] › tests/smoke/pwa.spec.ts:29:5 › PWA: the service worker never caches signed-in or admin pages @readonly (6ms)
  ✓  31 [smoke] › tests/smoke/lists.spec.ts:16:5 › plan my night: add from a venue → make public → share link renders logged-out (map, cost, WhatsApp, OG) (6.7s)
  ✓  37 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status @readonly (386ms)
  ✓  26 [smoke] › tests/smoke/feed.spec.ts:39:5 › one-tap pulse appears for a signed-in viewer within 2 s (Realtime) and an anonymous viewer within 30 s (20.3s)
  ✓  38 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (3.9s)
  ✓  40 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (425ms)
  ✓  36 [smoke] › tests/smoke/qa.spec.ts:14:5 › admin writes a pinned seed in /admin/qa → it renders first on the city Q&A page, logged-out, with its official answer (5.5s)
  ✓  42 [smoke] › tests/smoke/qa.spec.ts:39:5 › ask on a venue page → moderated → visible; it shows up in /admin/qa (5.3s)
  ✓  43 [smoke] › tests/smoke/seo.spec.ts:11:5 › robots.txt blocks private areas and points at the sitemap @readonly (8ms)
  ✓  44 [smoke] › tests/smoke/seo.spec.ts:17:5 › sitemap lists cities, venues, guides and safety pages @readonly (60ms)
  ✓  45 [smoke] › tests/smoke/seo.spec.ts:22:5 › home: canonical + WebSite search action + Organization @readonly (163ms)
  ✓  46 [smoke] › tests/smoke/seo.spec.ts:29:5 › venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings @readonly (435ms)
  ✓  47 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (1.7s)
  ✓  41 [smoke] › tests/smoke/security.spec.ts:7:5 › CSP is enforced and key pages (incl. the map) raise no violations @readonly (8.4s)
  ✓  49 [smoke] › tests/smoke/security.spec.ts:40:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice @readonly (359ms)
  ✓  50 [smoke] › tests/smoke/security.spec.ts:57:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights @readonly (128ms)
  ✓  51 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (1.4s)
  ✓  39 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (16.9s)
  ✓  48 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (7.0s)
  ✓  52 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (5.5s)
  ✓  55 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (2.0s)
  ✓  56 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (148ms)
  ✓  54 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (3.5s)
  ✓  53 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (3.8s)
  ✓  57 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (9.2s)
  ✓  58 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.4s)
  ✓  59 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (2.8s)
  ✓  60 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (6.9s)

  60 passed (1.5m)
```
Vitest in the same run: `Test Files  43 passed (43) Tests  269 passed (269)`

Acceptance evidence (`tests/rls/p5-assistant.test.ts` runs against **real Groq** on DEV):
- **Answers "where is busy in Lekki now" with vendor links:** a Lekki Phase 1 lounge is made live with four recent pulses and a snapshot refresh. The question's context includes it ("Lekki" matched to the area), and the streamed answer contains its `[[slug]]` token, which the UI renders as a link to `/v/<slug>`. Every token the model wrote was an offered venue (no invented venues).
- **Refuses a road-safety question with a safety link:** "Is the Lekki-Epe expressway safe to drive at night?" → `mode: safety` without calling the model; the reply links `/safety/lagos` and mentions 112 (service test + browser smoke `assistant.spec.ts` via the header's "Ask" link).
- **Limits + logging:** the 21st question from one user within the hour is refused (20/user/h; 200/IP/h also applied). Each question is logged privately with outcome and linked venues (`answered`, `safety_redirect` asserted), and the logs aren't reachable through the API.
- Unit (`tests/unit/assistant-guardrails.test.ts`): safety classifier (positive and negative cases), safety reply (no promise of action), token segmentation (unknown slugs stay plain text), and the retired-model mapping.

**P6 / P7 skipped:** `FEATURE_INSTAGRAM_FEED` and `FEATURE_VIDEO` are false in `.env.local` (and default to false), so per the build instructions these optional stages weren't built.

### Stage U1 — UX/UI upgrade
`NEXT_DIST_DIR=.next-verify npm run verify` (build into a separate folder so Fola's running `npm run dev` isn't clobbered) — build ✓, lint ✓ (no warnings), typecheck ✓, Vitest 43 files / 269 tests ✓, Playwright smoke 60/60 ✓. Last 30 lines:

```
  ✓  34 [smoke] › tests/smoke/pwa.spec.ts:5:5 › PWA: a guide read online opens offline; other pages fall back to /offline listing saved guides @readonly (442ms)
  ✓  37 [smoke] › tests/smoke/pwa.spec.ts:29:5 › PWA: the service worker never caches signed-in or admin pages @readonly (7ms)
  ✓  38 [smoke] › tests/smoke/safety.spec.ts:10:5 › emergency numbers render per city with verification status @readonly (458ms)
  ✓  39 [smoke] › tests/smoke/safety.spec.ts:24:5 › anonymous private report → exact confirmation → visible only in admin triage (8.4s)
  ✓  36 [smoke] › tests/smoke/qa.spec.ts:14:5 › admin writes a pinned seed in /admin/qa → it renders first on the city Q&A page, logged-out, with its official answer (9.5s)
  ✓  40 [smoke] › tests/smoke/safety.spec.ts:48:5 › honeypot submissions are not stored (690ms)
  ✓  41 [smoke] › tests/smoke/qa.spec.ts:39:5 › ask on a venue page → moderated → visible; it shows up in /admin/qa (6.4s)
  ✓  43 [smoke] › tests/smoke/seo.spec.ts:11:5 › robots.txt blocks private areas and points at the sitemap @readonly (13ms)
  ✓  44 [smoke] › tests/smoke/seo.spec.ts:17:5 › sitemap lists cities, venues, guides and safety pages @readonly (112ms)
  ✓  45 [smoke] › tests/smoke/seo.spec.ts:22:5 › home: canonical + WebSite search action + Organization @readonly (144ms)
  ✓  46 [smoke] › tests/smoke/seo.spec.ts:29:5 › venue page: canonical, specific LocalBusiness type with address + geo, breadcrumbs, no ratings @readonly (444ms)
  ✓  35 [smoke] › tests/smoke/feed.spec.ts:73:5 › 4-photo check-in: every request finishes in under 5 s (17.6s)
  ✓  42 [smoke] › tests/smoke/security.spec.ts:7:5 › CSP is enforced and key pages (incl. the map) raise no violations @readonly (8.3s)
  ✓  49 [smoke] › tests/smoke/security.spec.ts:40:7 › cookie consent (analytics only) › first visit asks; 'Essential only' is remembered; footer reopens the choice @readonly (519ms)
  ✓  50 [smoke] › tests/smoke/security.spec.ts:57:7 › cookie consent (analytics only) › privacy policy covers cookies, processors, retention and rights @readonly (140ms)
  ✓  47 [smoke] › tests/smoke/settings.spec.ts:26:5 › edit profile: username, home city, diaspora, location consent (2.4s)
  ✓  51 [smoke] › tests/smoke/tonight.spec.ts:41:5 › empty Tonight view invites the first pulse and vendor updates (804ms)
  ✓  48 [smoke] › tests/smoke/feed.spec.ts:136:5 › my posts, public profile and leaderboard pages render (3.6s)
  ✓  53 [smoke] › tests/smoke/tonight.spec.ts:49:5 › a pulse becomes a live venue: rail, hero count, polling API and crowd badge (3.6s)
  ✓  52 [smoke] › tests/smoke/settings.spec.ts:46:5 › avatar upload goes through the one-image pipeline (EXIF stripped, WebP) (4.7s)
  ✓  55 [smoke] › tests/smoke/tonight.spec.ts:77:5 › heat map renders on toggle (1.7s)
  ✓  57 [smoke] › tests/smoke/tonight.spec.ts:84:5 › forecast line shows once there are 4+ weeks of data (160ms)
  ✓  56 [smoke] › tests/smoke/settings.spec.ts:75:5 › delete account anonymises the profile and blocks sign-in (3.3s)
  ✓  54 [smoke] › tests/smoke/vendor.spec.ts:27:5 › fresh account → submitted vendor in under 10 minutes (10.9s)
  ✓  58 [smoke] › tests/smoke/vendor.spec.ts:90:5 › admin (with MFA) approves the listing and it goes live (4.2s)
  ✓  59 [smoke] › tests/smoke/vendor.spec.ts:112:5 › official update in two taps appears on the vendor page labelled Official (3.0s)
  ✓  60 [smoke] › tests/smoke/vendor.spec.ts:135:5 › claim flow: claimant uploads ID, admin approves, claimant becomes owner (6.9s)

  60 passed (1.5m)
EXIT 0
```

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

**L2 (2026-10-07)**
- Migrations follow the PRD order, with two FK-driven swaps: `profiles` (0007) before `vendors`, `events` (0011) before `posts`. Each table migration enables RLS immediately (default deny); grants + policies are all in `0029_rls.sql` as the PRD orders. `0032` only adds argument defaults to `admin_write_audit`.
- Additive schema details (no PRD field removed or changed): `created_at`/`updated_at` on every table (PRD convention), `deleted_at` on events and guides (convention), `point_events.kind` also allows `admin_adjustment` (for §11.13 manual adjustments), `moderation_items.entity_type` also allows `guide`/`qa_question`/`qa_answer` (P3), CHECK constraints on lengths/ranges, `v_public_profiles` also exposes `id` (needed to attribute posts; it's already on every post).
- Admin access to `private.*`: PostgREST can't reach `private` even with the service role, so server code uses **service-role-only RPCs** in `public` (`admin_write_audit`, `admin_list_cron_jobs`; more in L12). They're revoked from anon/authenticated.
- RLS design: column-level privileges stop API callers setting server-owned fields (post status / moderation / distances / expiry, vendor verification / publishing, profile role / trust / shadowban). Publishing, moderation, verification, sanctions and points are service-role actions in `/lib/services` behind `requireRole()` + aal2, and audited. Helper functions (`has_staff_role` requires `aal2`, `is_verified_user`, `is_vendor_member`, `can_post_official`, `author_is_visible`, `get_my_profile`) are SECURITY DEFINER with `search_path=''`, wrapped in `(select …)` in policies.
- Shadowban: profile column grants hide `is_shadowbanned`, `trust_score`, `role`, `status` from everyone; owners read their own row via `get_my_profile()`, which still omits the shadowban flag and trust score. Post visibility uses `author_is_visible()` (one PK lookup).
- Audit: generic `private.audit_row_change()` trigger on every user-facing table (19 tables), skipping counter/timestamp-only updates; plus explicit `writeAudit()` (`lib/admin-db/audit.ts`) for privileged actions with actor, reason and real client IP.
- Moderation queue population is trigger-driven now (auto_block P1, auto_flag P2, holds P2, 2 % random sample P5, report thresholds, vendor-member reports = `vendor_dispute`, 3+ reports auto-hide). Full pipeline + tests in L8.
- Pulse: `posts_before_insert` forces pulse to `published` / `auto_pass` with no body. Distance and `is_at_venue` (< 300 m) are always computed server-side from the vendor location.
- `activity_events`: **pg_partman 5.3.1 is available**, so monthly native range partitions with 13-month retention (`partman-maintenance` cron). Partitions have no API grants.
- Crowd weighting exactly per §6.11; confidence thresholds Σw < 2 / 2–5 / > 5 (one fresh official update = 3 → medium). Forecast averages per day first, `sample_size` = distinct days. Snapshots pruned after 70 days.
- Storage: 5 buckets with size + MIME limits; **no storage.objects policies for API roles** — uploads use signed upload URLs, public buckets are served via public URLs, everything else server-side. Supabase's `protect_objects_delete` trigger blocks SQL deletes on storage, so purge jobs call the Storage API via `pg_net` using Vault secrets (see Open question 4). Until then they delete nothing and never mark docs as purged.
- `scripts/dev-db.mjs` (`npm run db:push|db:seed|db:types`) refuses to run unless `SUPABASE_DB_URL` belongs to `SUPABASE_PROJECT_REF`. psql (Homebrew) is used for seeding; it's a system tool, not an npm dependency.
- Super admin created on DEV for `SUPER_ADMIN_EMAIL` (email confirmed, no password → sign in by magic link once L3 lands; MFA enrolment required for admin).
- `LAUNCH.md` started as a running checklist (DB steps so far); finalised in L15.
- RLS tests live in `tests/rls/` and run in `npm run verify` against DEV (env loaded by `tests/setup/load-env.ts`). Fixtures are tagged with a run id and deleted afterwards.

**L3 (2026-10-07)**
- Auth uses the standard Supabase flows from Server Actions (`signUp`, `signInWithPassword`, `signInWithOtp` with `shouldCreateUser:false` so new accounts always pass the terms checkbox, `resetPasswordForEmail`, `resend`). Responses for magic link / reset / resend are generic (no account enumeration); signup relies on Supabase's obfuscated response for existing emails.
- `/auth/callback` handles both `?code=` (PKCE: Google + default templates, same browser) and `?token_hash=&type=` (server-side `verifyOtp`, works across devices). LAUNCH.md lists the recommended email-template URLs. `next` is always passed through `safeNext()` (open-redirect safe, unit-tested).
- Rate limits (`lib/ratelimit`, Upstash sliding window): login 20/email/15 min + 300/IP/15 min, signup 100/IP/h, magic link / reset / resend 5 per address per hour + 100/IP/h (the per-address figure is my choice; the PRD doesn't specify it). Keys for emails are SHA-256 hashed. **Fail-open** if Upstash is down (Sentry alert): availability first, and Supabase Auth keeps its own limits.
- Guards (`lib/auth/guards.ts`): `getSession()` uses `auth.getUser()` (verified by the Auth server) + `get_my_profile()`; `requireRole()` 404s non-matching roles and sends staff without `aal2` to `/admin/mfa`; `requireVendorMember()` checks accepted membership + role rank.
- Middleware refreshes the session only when an `sb-…-auth-token` cookie exists (anonymous visitors skip the Auth round-trip) and redirects anonymous visitors away from `/me`, `/vendor`, `/admin`. The header's auth state is a client component so public pages stay static/ISR.
- Admin routes live in `app/admin/(secure)` (layout = `requireRole('moderator')` + aal2) with `/admin/mfa` outside the group. MFA uses Supabase's built-in TOTP: QR comes back as an SVG data URI, so no QR or OTP library was needed (`otplib` not installed). Abandoned unverified factors are cleaned up before re-enrolling.
- Media pipeline core landed early for avatars: `lib/media/image.ts` (sharp: EXIF orientation applied then ALL metadata dropped, ≤ 2000 px long edge / 512² for avatars, WebP q80, blurhash, 64-bit dHash, decompression-bomb limit), `lib/media/uploads.ts` (signed upload URLs into `media-incoming/{uid}/…`, own-folder path check), `POST /api/media/process` (exactly one image per call, `mediaUser` 12/h). Image moderation is a stub returning `auto_pass` until L8 (callers already branch on the decision). HEIC isn't accepted (sharp's prebuilt binaries can't decode it); iOS converts to JPEG for file inputs.
- Delete account: profile anonymised + posts hidden immediately, auth user soft-deleted (`deleteUser(id, true)`, so it can't sign in and the anonymised profile row survives), audited, signed out. Media files go via the daily purge (pending Vault, Open question 4).
- Signup/login IP + UA go into `private.profile_meta` via a service-role RPC (`0033`). Informational only.
- `/privacy` and `/terms` are template pages so signup links resolve. Final wording is in L13.
- Playwright smoke runs Chromium with an iPhone 13 viewport against `next start` on port 3100, loading `.env.local` (`tests/setup/load-env.ts`). Test users use `@example.com` (admin API only) and are deleted after each run. TOTP codes in tests are computed with Node crypto (RFC 6238).
- Google sign-in is wired (`signInWithOAuth` → `/auth/callback`) but not e2e-tested: the DEV consent screen is in Testing mode.

**L4 (2026-10-07)**
- DEV sample content: `npm run db:samples` (`supabase/seed/dev-sample-content.sql`) **publishes the 60 fictional seed vendors on DEV** and gives them sample hours, prices and features so the directory can be built and tested. `seed.sql` still inserts them as drafts per the PRD. This file must never run on PROD (LAUNCH.md says so). The L2 seed test now counts sample vendors regardless of status; draft invisibility is still tested with a dedicated draft vendor.
- `opening_hours` JSON format: `{"mon":[["18:00","02:00"]], …}`. End ≤ start means past midnight; `["00:00","00:00"]` means 24 h. Open-now logic lives in `lib/services/opening-hours.ts` (date-fns-tz, venue/city time zone).
- Public reads use a cookie-less anon client (`lib/db/public.ts`), so vendor pages are ISR (60 s) and see exactly what anon sees under RLS. Queries live in `lib/db/directory.ts`; filter logic is in `lib/services/directory.ts`.
- `0034`: `lat`/`lng` exposed as PostgREST computed fields (functions over vendors/cities/areas/events; geography otherwise comes back as hex EWKB); `search_directory()` combines FTS (`search_tsv`), escaped substring and `word_similarity > 0.45` across published vendors, upcoming events and published guides (SECURITY INVOKER, so RLS applies).
- City directory: one query per city (≤ 500 vendors), filtered in memory so the category chips show city-wide counts. Filters are a no-JS GET form + link chips; unknown values are dropped by zod. Pagination is needed only once a city passes ~500 published vendors (noted for later).
- Map: `MapToggle` shows a Mapbox **Static Images API** preview (or `cities.hero_image_url` when set) and loads `react-map-gl/mapbox` + `mapbox-gl` via `next/dynamic` only on click. Pins fit their bounds; tapping one opens a popup linking to the venue. The heat layer is L7.
- Vendor page = §8.2 minus feed/pulse/check-in (L6) and crowd badge/forecast (L7). Description is rendered as plain paragraphs (no HTML) until the sanitised markdown renderer lands in L10. Outbound links are http(s) only (`safeExternalUrl`). The Uber link also sets `pickup=my_location`. The unclaimed-venue CTA links to `/vendor/onboarding?claim=…` (built in L5).
- Performance: Fraunces loads at weight 600 only. The header's sign-in state now checks for the Supabase auth cookie instead of importing supabase-js, which took ~110 KB off every public page. Vercel Analytics / Speed Insights render only on Vercel builds (no local 404s).
- Accessibility: buttons use brand green #0B7A3B (white text ≈ 5.5:1). A new `positive` colour token covers green text/icons on dark surfaces. Fixed definition-list structure and the header link's accessible name.
- Lighthouse runs use `npx lighthouse@12` against the local production build with the installed Chrome. It's a one-off tool run, not a project dependency.
- OG images: `next/og` (part of Next; `@vercel/og` approved). Shared card in `lib/og/card.tsx`; per-vendor and per-city images plus a site default. `robots.ts` disallows everything on Vercel Preview so DEV data is never indexed.

**L5 (2026-10-07)**
- Wizard: `/vendor/onboarding?step=basics|contact|photos|details|prices|review`. Step 1 creates the draft (slug = name + city, with a short suffix if taken; checked with the service role because drafts are invisible under RLS). Later steps autosave 800 ms after the last change and flush before "Next". The same editor (minus Review) powers `/vendor/profile`. Published listings stay live when edited; edits are audited, not re-reviewed (PRD is silent).
- Location: defaults to the chosen area's centroid. Two ways to adjust: "I'm at the venue — use my location" (browser geolocation, only on request) or dragging a pin on a lazily-loaded map. No geocoding API.
- Minimum to submit: area + at least one contact method. Completeness % comes from the `vendor_completeness` computed field, with optional suggestions on the review step.
- Current vendor (members of several venues) is kept in an httpOnly `vendor_ctx` cookie and re-validated against membership on every request. Switcher on the dashboard.
- Member roles: owner/manager edit the listing and prices; staff can only post official updates (RLS-enforced and tested).
- Official update = crowd level (+ optional note ≤ 280, + optional ONE photo processed inside the Server Action). The post is inserted through the member's RLS client (`can_post_official`); the §8.5 decision then publishes, holds (media from accounts < 7 days or trust < 50) or hides it. With text/image moderation still stubbed (L8), photo-less updates publish immediately. Official update **points are awarded in L6** together with the rest of the points system.
- Claims: a verification request from a non-member on an **unclaimed, published** vendor is treated as a claim (no extra column). Claims require a photo ID. Approval makes the claimant owner + `claimed` + `verified` (the same documents are reviewed). Verification and claim requests live in `private.vendor_verification_requests`, reached through service-only RPCs (`0035`). Members see their own request status via `my_verification_requests()`. Docs go to the private bucket via signed upload URLs (≤ 10 MB, PDF/JPEG/PNG/WebP); admins get 10-minute signed read URLs.
- Emails (Resend + React Email): vendor submitted (with the free-listing notice), admin new submission / request, vendor approved / rejected (with reason), verification / claim decision. With `RESEND_API_KEY` empty they're skipped and logged, never failing the action. Admin recipients: `EMAIL_ADMIN_TO`, falling back to `SUPER_ADMIN_EMAIL`.
- Minimal admin (`/admin/vendors`, `requireRole('admin')` + aal2): approve / reject (reason required, emailed, audited), verification / claim decisions, read-only preview of drafts at `/admin/vendors/[id]/preview`. Built as services in `lib/services/admin/vendors.ts` so L12 extends rather than rewrites it.
- QR poster at `/vendor/qr`: SVG generated server-side with `qrcode`, linking to `/v/[slug]?pulse=1`; printable (print CSS hides the chrome).
- Fix: guards in layouts didn't know the requested path, so post-MFA redirects went to `/admin`. Middleware now forwards `x-pathname`, and `requireRole()` uses it.
- Auth pages now have a real `<h1>` (was `<h2>`); wizard chips no longer wrap.
- Test hygiene: a failed smoke run left a pending claim on DEV. I closed it directly in SQL (DEV only), and the test now rejects anything it leaves pending.

**L6 (2026-10-07)**
- **Security fix found during L6:** `posts` had a table-wide SELECT grant, so a post's precise `location`, distance and moderation scores were readable through the Data API, and Realtime payloads carried them too. `0037` switches `posts` and `post_media` to column-level grants (Realtime honours them). A regression test was added.
- Check-in flow: `createCheckin` inserts a pending post → each photo is signed-uploaded and processed in its own request (`/api/media/process`, purpose `post`, max 4) → `finalizeCheckin` runs the §8.5 decision (text + image scores, holds) and awards points on publish. Check-ins that are never finalised are removed by the daily purge after 24 h (`purge_abandoned_posts`, `0036`).
- Location is a soft signal and only stored with consent. Ticking "Mark me as at the venue" in the check-in sheet counts as explicit consent and sets `profiles.location_consent` (revocable in Settings). Pulses only use location if the browser *already* granted it (no prompt). `is_at_venue` / distance are computed server-side (trigger).
- Points (§1.6): pulse 1 (+1 at venue); check-in 3 (+2 photo, +2 at venue, +5 first check-in at that venue that Lagos day); vendor official update **5 vendor points, at most once per hour per venue** (amount is my choice; the PRD doesn't specify it). Daily cap 60/user/Lagos day. Awarded once per post, only when published; held posts earn points on human approval (L8 hook). Badges: Explorer (5 venues), Night Owl (5 posts between 00:00 and 04:00 Lagos), First-in (ever first at a venue that day). `FEATURE_POINTS=false` disables awarding and the leaderboard page.
- **Likes: who-liked is kept in Upstash Redis sets** (`likes:{postId}`), because §6 has only `posts.like_count` and no likes table (adding one would change the schema). The count is written back to `posts.like_count`. If Redis data were ever lost, people could like again; that's acceptable for a vanity metric. Rate limit 120 likes/user/hour (my addition).
- Live feed: the venue page server-renders the feed (ISR). Signed-in visitors subscribe to `postgres_changes` on `posts` filtered by venue and only count as live after Postgres confirms the subscription; supabase-js is dynamically imported for them only. Anonymous visitors poll `/api/live/v/[slug]` every 15 s (CDN `s-maxage=10`, 120/IP/min). After a user posts, the feed refreshes immediately.
- Feed shows non-expired community posts (pulse/check-in/update) newest first; official updates are pinned on top for 24 h. Expired posts stay on `/u/[username]` and `/me/posts`. The cover strip shows the last 12 community photos labelled "Community photo · Unverified".
- New pages: `/me/posts` (all own posts with status, including "Your photo is being reviewed — usually under an hour"; soft delete), `/u/[username]` (ISR), `/leaderboard/[city]` (monthly + December in Nigeria, from the hourly materialized views), `/leaderboard` → Lagos.
- Bundle: the check-in and report sheets (Radix Dialog) load after the page is interactive (`components/feed/lazy.tsx`), and supabase-js loads only at upload time. Venue page first-load JS is 240 kB (it was 326 kB before these fixes).
- Noted for L13: a report-only CSP `unsafe-eval` violation appears on the venue page; I'll trace its source before enforcing CSP.

**L7 (2026-10-07)**
- Tonight view (§8.1) is a server component (`components/tonight/tonight-view.tsx`) used by `/` (default city Lagos, ISR 60 s) and `/c/[city]` (Tonight + the L4 directory with filters, one shared map). City choice: signed-in users with a home city are redirected to it; "Near me" uses one-off geolocation on tap (explicit); otherwise Lagos.
- Live rail sorted confidence desc, crowd desc (from `v_live_now`). Cards show the latest community photo or cover, a crowd badge ("early signal" when confidence is low), price band, area, and "Official update N min ago" (if within 90 min) or "N check-ins · N min ago".
- Realtime: signed-in visitors subscribe to `crowd_snapshots` changes (no city column to filter on, so one debounced refetch per 5-minute run); anonymous visitors poll `/api/live/[city]` every 30 s (CDN `s-maxage=30`, 120/IP/min). **No server data cache for live data:** I tried `unstable_cache` and it served stale data to cache-busting refetches.
- Map: heat layer weighted `crowd_level_avg × (post_count + official_count × 3)`, pins coloured by crowd, tapping a pin opens a bottom panel. On `/c/[city]` the same map also pins every place matching the directory filters.
- Forecast line on the venue page: today's busiest usual hour (`sample_size ≥ 4`), behind `FEATURE_CROWD_FORECAST`. The empty state lists "usually busy around now" venues for the current Lagos weekday and hour.
- December in Nigeria banner shows between the season dates (Lagos date) and links to `/events/december` (built in L9). Events rail and trending guides on the Tonight view arrive with L9 / L10 content.
- `0038`: service-role RPCs `admin_refresh_crowd_snapshots`, `admin_refresh_crowd_forecast`, `admin_refresh_leaderboards` (tests, benchmarks, future admin "refresh now").

**L8 (2026-10-07)**
- Moderation provider: OpenAI `omni-moderation-latest` (`lib/moderation/openai.ts`), text and images. Images go as a 512 px JPEG data URL. 3.5 s timeout, no retries, so every pipeline request stays under 5 s. Score = max over all categories.
- Fail-safe: if moderation can't run (no key / error / timeout), the content is treated as at least `auto_flag` (published and queued, or held if a hold applies). Image scores are stored per photo at processing time; `null` = unavailable.
- Blocklist: `platform_settings.blocklist_phrases`, whole-word and case-insensitive; a hit scores 1.0 → auto-block. It's edited in Admin → Settings (L12). Avatars and vendor photos are rejected at the block threshold.
- Heuristics (`lib/moderation/heuristics.ts`): only a near-duplicate photo (dHash Hamming ≤ 6/64) already posted at a **different** venue in the last 30 days, or **> 3 posts in 10 minutes**, escalates (P1). Distance, at-venue and IP/device data are shown to moderators as informational and never act automatically. The risk score is display-only.
- Human decisions (`lib/services/admin/moderation.ts`): approve (+2 trust, publish, award held points, reports `resolved_kept`), approve + verify, remove (−10, or −25 for fake / rival sabotage), remove + warn (30-day warning), remove + suspend (7 days), remove + ban, shadowban, dismiss. Removals, sanctions and shadowbans require a reason. The author is emailed on removal. Everything is audited. Sanction → profile status / shadowban flag is handled by the L2 triggers.
- Minimal `/admin/moderation` (moderator + aal2): priority/age-ordered queue with tabs (holds, auto-blocked, flagged, reports, disputes, random sample), post preview, top scores, author card (trust, account age, post count, status), signals, reports, actions. Keyboard shortcuts, stats and bulk actions follow in L12 (same service, extended).
- Vendor disputes: venue staff see recent community posts on their dashboard with "Not ours" → a report with reason `wrong_venue`, which the L2 trigger turns into a P2 `vendor_dispute`.
- `/guidelines` (Community Guidelines) is linked from the footer disclaimer and footer nav. The removal email links to it.
- `0039`: `admin_list_audit()` service-role RPC (L12 audit viewer + tests). `safeRevalidatePath()` lets services run outside Next (tests/scripts).
- Test infra: Vitest compiles TSX (React Email templates) via the automatic JSX runtime. Playwright smoke uses 3 workers against the shared DEV project, with a 10 s default for UI assertions (explicit performance limits are unchanged).

**L9 (2026-10-07)**
- **Bug fixed (0040):** Supabase's `pg-safeupdate` rejects UPDATE/DELETE without WHERE on API sessions. The season re-flag trigger had a bare `UPDATE events SET …`, so changing season dates through the API would always have failed. It now only touches rows whose flag changes. I audited every other UPDATE/DELETE in our SQL; all have WHERE clauses.
- Submission (`/events/submit`, verified users; venue members can post as their venue): times are entered in Lagos local time (`datetime-local`) and stored as UTC. Choosing a listed venue copies its location; otherwise a free-text venue name is used. Title and description go through the moderation pipeline: auto-blocked text is refused, flagged text is queued (`moderation_items`, entity `event`). Rate limit 10 submissions/user/day (my choice). Status is always `pending_review` (guard trigger + RLS: users can't publish).
- Admin (`/admin/events`, admin + aal2): approve, reject (reason required, emailed), feature/unfeature, mark cancelled (reason required). Audited. The duplicates finder and editing come in L12.
- Public: `/events` (city + category chips, list grouped by Lagos date, month grid that shows counts on phones and titles on larger screens, prev/next month), `/events/december` (countdown before the season, season-only list), `/events/[slug]` (ISR 5 min, venue card, external ticket link, share, add to calendar, map, report, Event JSON-LD), `/events/[slug]/ics`, `/events/calendar.ics?city=&season=december`, per-event OG image. Cancelled events stay listed, marked "Cancelled". No tickets are sold here and the page says so.
- Tonight view gains a "This week" events rail; `/vendor/events` lists a venue's events; the header has an Events link; events are in the sitemap.
- Hand-written iCalendar writer (`lib/events/ical.ts`), no dependency. Default duration 3 h when no end time is given.

**L10 (2026-10-07)**
- **Markdown: no library.** `marked` is present in node_modules only as another package's transitive dependency and isn't approved (§4), so `lib/content/markdown.ts` is a small purpose-built renderer: ##–#### headings (a single # becomes h2), paragraphs, bold/italic/code, fenced code, links, images, lists, quotes, rules, line breaks. Raw HTML is escaped; only http(s), mailto, same-site and #anchor URLs survive; output then goes through `isomorphic-dompurify` with a strict tag/attribute allowlist (a hook adds `rel=nofollow noopener noreferrer target=_blank` to external links). Custom tags `<VendorCard slug>`, `<Map vendors>`, `<PriceTable vendor>`, `<Callout type>` are parsed into structured blocks **before** any HTML exists and rendered as React components; unpublished or unknown venues simply don't render.
- Routes: `/guides`, `/guides/[city]` (hub with Daytime / Nightlife / Food tabs = tagged guides + venues from those category groups), `/guides/[city]/[slug]` (city_guide / area_guide / daytime), `/toolkit` + `/toolkit/[slug]`, `/blog` + `/blog/[slug]`. `safety_page` guides render on `/safety/[city]` (L11). All are ISR 5 min, with OG images and sitemap entries. JSON-LD: `Article` (`BlogPosting` for blog) plus `TouristAttraction` for embedded venues.
- CMS (`/admin/content`, admin + aal2): list with type / status / search filters; editor with toolbar snippets for the custom tags, live preview (same parser; embeds as placeholders), Ctrl/⌘+S save, cover upload (one-image pipeline → `guides` bucket, admin + aal2 enforced in the route), SEO fields, tags, send to review / publish / archive (`published_at` set on first publish; publishing needs some body), revisions (trigger-created on every body change) with restore. Every action is audited.
- Draft preview: HMAC-signed link (TOKEN_ENCRYPTION_KEY), valid 1 hour, `noindex`. Anyone with the link can view the draft during that hour, which is the point of a preview link.
- Publishing guides, approving venues and approving events now also revalidate `/sitemap.xml`.
- The 12 seeded toolkit drafts stay as drafts until real content is written (L15 content loader).

**L11 (2026-10-07)**
- `/safety` (national numbers + city list) and `/safety/[city]` (published `safety_page` guide for the city, if any, then national + city `safety_info` grouped by section). Every block shows "Last verified: {date}", or "not yet verified — please double-check" while `last_verified_at` is null (all seeded rows today). Bold numbers become `tel:` links. A prominent "not an emergency service — call 112" banner. No incident feed, no map of reports.
- Report an issue (`#report` on each city page): category, optional area, description, optional one-off location. Anonymous reports need an email; signed-in reports are linked to the profile. Hidden honeypot field. Rate limits 5/user/h and 50/IP/h. Stored via the service-role RPC `admin_create_issue_report` (`0041`) into `private.issue_reports`. Safety-category reports email admins (category only, no report content in email). Confirmation copy is verbatim from §10.
- Admin triage (`/admin/issues`, admin + aal2): list ordered new → escalated → triaged → closed, status + internal note, audited. CSV export comes with the L12 data tables.
- Safety info is seeded only with the PRD's national numbers + LASEMA. Hospitals, police stations, embassies, travel advice and so on need verified data from you; I deliberately did not invent phone numbers. They're edited in the L12 content CMS (safety_info editor).
- Footer now links Safety and the Diaspora toolkit.

**L12 (2026-10-07)**
- Admin nav is role-aware. Moderator: Dashboard, Moderation, Posts, Reports, Users, Tasks. Admin adds Vendors, Events, Content, Safety info, Issues, Cities, Points, Audit log. Super admin adds Settings. Every page re-checks the role server-side (`requireRole`, aal2); a role that's too low gets a 404.
- **DataTable** (`components/admin/data-table.tsx`): server-rendered. Sort, page and filters live in the URL, so views are shareable and work without JS. Saved views ("Save view") go in localStorage per table. Row checkboxes post to a separate bulk form. CSV export at `/admin/export/[table]` (vendors / users / posts / audit / issues): role + aal2 checked in the route, 30 exports/user/hour, max 10k rows, formula-injection-safe cells, every export audited. `users` is super_admin only and never includes IPs.
- **Dashboard:** KPI tiles from `private.v_platform_summary`, 14-day inline-SVG sparklines, needs-attention panel (pending vendors/events, P1 items, never-verified safety rows), tasks due, moderation stats, recent admin actions (admin+).
- **Live activity stream:** `activity_events` is partitioned (pg_partman), and Realtime `postgres_changes` can't stream partitioned tables (the WAL names the partition), so 0043 never delivered. `0044` switches to **Broadcast from Database**: an AFTER INSERT trigger calls `realtime.send` to the private topic `admin:activity`, and a `realtime.messages` policy allows only `has_staff_role('moderator')` (aal2). Same §11.1 behaviour, different transport. The audit log isn't realtime: the dashboard shows the latest audit entries on load.
- **Vendors:** "All vendors" tab with every §11.2 column and filter, bulk approve / suspend (reason required), export. Detail page tabs: Overview (actions + staff edit of core text fields, reason required), Posts, Members, Prices, Events, Verification (signed URLs + decide), Reports, Audit, Notes; plus "View as vendor" (the existing read-only preview) and "Create a task".
- **Users:** email column for admin+; last IP for super_admin only, labelled informational with a CGNAT warning. Actions by role: moderators warn / suspend / shadowban / lift; admins also ban (+ force logout), reset trust, force logout, delete & anonymise (same `anonymiseAccount` as self-delete). Nobody can sanction themselves, and only a super admin can act on staff accounts. Role changes are super_admin only behind a **fresh MFA code (≤ 5 min, from the JWT `amr` claim)**, and they sign the user out everywhere. The timeline is the user's audit trail; notes are append-only audit entries (`note.added`).
- **Posts:** all statuses with status / kind / hold / decision / venue / author / since / reported filters; bulk hide or remove (reason required, audited).
- **Reports:** open by default, status / entity / reason filters, mark reviewing, resolve kept / removed, or dismiss (note required).
- **Moderation additions:** stats line, keyboard shortcuts **A** approve · **R** remove (focuses the reason box first if it's empty) · **S** skip to the next item · **N** focus the note/reason box. "Add blocklist phrase" is append-only for moderators (audited); the full blocklist is edited in Settings. Decision: I read §11.3's "A/R/S/N" as Approve / Remove / Skip / Note.
- **Events:** staff edit (title, times in venue timezone, category, venue name, ticket link, prices, description; reason required) and a duplicates finder (same city + day, pg_trgm title similarity).
- **Cities & areas:** create / edit with a click-to-place pin on a Mapbox map (centroid). Polygons / bboxes aren't drawn in the UI (§11.10 says "map editor"; the pin covers what the directory uses today).
- **Tasks:** kanban (to do / doing / done) with priority, assignee, due date and related entity. Moves are plain form posts.
- **Audit log:** filter by action prefix / entity / actor, keyset pagination, field-level before→after diff, export.
- **Points:** adjust ±, reset to 0, grant / revoke badge, all with a reason, written as `admin_adjustment` point events (running totals via the existing trigger).
- **Settings (super_admin):** thresholds, hold rules, posting limits, check-in expiry, season dates, FX, notice, listing-is-free, **maintenance mode (now enforced: pulses, check-ins and official updates are refused while it's on)**, blocklist; read-only feature flags; staff roles list; **async data export** (gzipped JSON of content tables, no emails / IPs / auth data) via `after()` into the private `exports` bucket, with a 24 h signed link emailed to the requester and 10-minute links listed on the page. Agent API keys arrive with P1.
- **Safety info editor** (`/admin/safety`): create / edit / delete (delete needs a reason), city or national, section, ordering, and a "checked against the official source today" box that stamps `last_verified_at` / `verified_by`.
- **Daily digest:** `/api/cron/digest`, Vercel cron `0 7 * * *` (08:00 WAT), `Bearer CRON_SECRET` checked in constant time. Counts only, no user content, sent to `EMAIL_ADMIN_TO` (fallback `SUPER_ADMIN_EMAIL`).
- **Bug fixes found while testing:** (1) empty optional numeric fields were coerced to `0` by `z.union([z.coerce.number(), z.literal("")])`, so the literal now comes first (settings FX and event prices). (2) `moderation_items` has no FK to its post, so hard-deleted posts (vendor deletion cascade; on DEV, test cleanup) left queue items open forever: 130 orphans on DEV. `0045` closes items when the post is deleted and cleaned up the existing orphans.
- New rate limit `exportUser` 30/h (PRD doesn't specify). `safeRevalidatePath` accepts a type (`/safety` layout revalidation).

**L13 (2026-10-07) — §7 checklist**
- 7.1 RLS default-deny on every table ✓ (matrix); `private` not exposed ✓ (L2 Management-API test); staff policies need aal2 ✓ (matrix shows aal1 staff = users).
- 7.2 Service role only in `lib/admin-db` + scripts ✓ (lint rule, source grep, built-bundle scan).
- 7.3 Email verification before posting ✓ (L2); TOTP for all staff ✓; auth cookies `SameSite=Lax; Secure` in production ✓. **Custom SMTP still pending on Fola** (open question 5).
- 7.4 zod: route handlers now validate params/query too (`lib/validation/routes.ts`: slug params, the iCal query, auth callback query), with a static test that any handler reading input calls `.parse`/`.safeParse`. Server Actions are thin wrappers; their services parse with zod (CLAUDE.md pattern). The L12 admin services that took raw ids now `z.uuid().parse` them.
- 7.5 Rate limits ✓ (every limit is wired except the P5 assistant limits).
- 7.6 Uploads ✓ (L6). 7.7 Headers ✓ (enforced). 7.8 Sentry scrubbing ✓. 7.9 Audit ✓. 7.10 Abuse controls ✓ (L8).
- 7.11 Dependencies: production tree clean; dev tooling advisories documented (open question 1).
- 7.12 Data protection: privacy/terms ✓, location consent ✓, anonymisation on delete ✓, doc purge ✓, **but deleting media files in Storage within 24 h needs the Vault decision (open question 4)**. Until then files stay, and rows are never falsely marked purged.
- 7.13 Backups ✓ (weekly logical backup; PITR on PROD per SETUP/LAUNCH). 7.14 DEV-only credentials ✓.
- **CSP decision:** enforced with `'unsafe-inline'` for scripts and no `'unsafe-eval'`. A nonce-based CSP would force every page to render dynamically (Next.js nonces need per-request HTML), which kills the ISR/static caching the PRD's performance targets rely on. The only eval-type violation was zod v4's JIT probe (`new Function("")` in a try/catch); `instrumentation-client.ts` sets zod's global `jitless` before any schema runs, with no zod import there and so no bundle cost.
- **Backup decision:** Vercel functions have no `pg_dump`, so the weekly backup is a *logical* dump. Service-role-only RPCs `admin_backup_tables()` / `admin_backup_rows()` (`0046`) page every public + private table by primary key into gzipped NDJSON (line 1 = header). `activity_events` (13-month telemetry) and Supabase's `auth.*` are excluded; auth is covered by PROD PITR. Restoring = replaying rows per table. PITR remains the primary recovery path.
- **Consent decision:** a first-party `consent` cookie (`analytics` | `essential`, 180 days, Lax, Secure on https). Essential = Supabase session cookies. Analytics + Speed Insights mount only with consent and only on Vercel; analytics drops query strings and never reports `/admin`. The banner is hidden in admin. Smoke tests start with "essential" pre-set so the banner doesn't cover controls.
- **Privacy policy / terms:** rewritten to match what the code does: data collected, legal bases, cookies, processors (Supabase London, Vercel, Sentry EU, Upstash, OpenAI moderation, Mapbox, Resend), retention (24 h uploads, 30-day docs, 70-day snapshots, 13-month logs, 8-week backups), NDPA/UK rights with NDPC/ICO complaint routes, 18+. Contact address comes from `NEXT_PUBLIC_CONTACT_EMAIL` (in `lib/config.ts`, default hello@ the production domain). These are templates and need a lawyer's review (open question 8).
- SQL test helper `tests/helpers/psql.ts` runs `tests/sql/*.sql` with credentials passed only through `PG*` env vars (never argv), and refuses any database that isn't the DEV project.

**L14 (2026-10-07)**
- **What moved the Lighthouse numbers** (from 77–88 to 91–93):
  1. The new cookie banner became the LCP element (it rendered after hydration, ~3.3 s render delay). It's now server-rendered and hidden before first paint by a tiny inline script (`CONSENT_BOOT_SCRIPT`) plus CSS when a choice exists. No flash, no late paint.
  2. **Lazy Sentry in the browser:** the SDK (~350 KB raw, mostly tracing) was in the shared first-load chunk of every page. It now loads after `load` + idle (`lib/sentry/client-lazy.ts`) with the same options. Errors before then are buffered and sent once it's ready, and `global-error` uses the same path. Shared first-load JS went from 171 kB to 105 kB.
  3. **Map previews as same-origin WebP:** `/api/map/city/[slug]` (prebuilt per city) and `/api/map/vendor/[slug]` (on first request) fetch the Mapbox static image server-side, re-encode with sharp (55–70 KB PNG → 9–17 KB WebP) and cache for 30 days (ISR + CDN headers). The city preview is preloaded at high priority from `<head>`. Side benefit: about one Mapbox static call per city/venue per month instead of per page view. The server request sends our site as `Referer`, so the URL-restricted PROD token keeps working (LAUNCH step 14).
  4. **zod no longer ships to public pages:** form option lists (`VIBES`, `REPORT_REASONS`, `EVENT_CATEGORIES`, `GUIDE_TYPES`) moved to the zod-free `lib/validation/constants.ts` (re-exported from the old paths).
  5. **CLS:** the pulse bar used `useSearchParams`, which forced client-only rendering on the ISR venue page (empty Suspense fallback → bar popped in → feed shifted). It now reads `?pulse=1` after mount, so it's in the HTML. CLS went from 0.035 to 0.005.
  6. The display font (Fraunces) is no longer preloaded, so it doesn't compete with the LCP resource; headings swap in.
  - Tried and rejected: `experimental.inlineCss`. It puts the stylesheet in the HTML twice (style tag + RSC payload, +74 KB raw on every page) and scored worse.
- **JSON-LD audit:** venue pages now have a specific schema.org type per category (NightClub, BarOrPub, Restaurant, Beach, MovieTheater…) with PostalAddress, geo, opening hours, price range, amenity features and sameAs, plus BreadcrumbList. Guides / toolkit / blog add BreadcrumbList alongside the existing Article. Home has WebSite (SearchAction → `/search?q=`) and Organization. Events keep their Event JSON-LD. No ratings or reviews anywhere (§16).
- **Canonical / robots / sitemap:** canonical added on home, leaderboard and guidelines (the others had it). Robots also disallows `/preview/`, `/reset`, `/verify`. The sitemap gains leaderboards (when points are on).
- **Blurhash placeholders:** `lib/media/blur.ts` decodes the stored blurhash to an 8×8 BMP data URL (~330 chars, no new dependency) for `next/image placeholder="blur"` on post photos, community photos and live cards.
- **ISR review (no changes needed):** live surfaces revalidate at 60 s (home, venue, profiles) and use Realtime/polling on the client. Content revalidates at 300 s and on publish/approve (guides, events, safety, sitemap). OG images 1 h, sitemap 1 h, map previews 30 days. City and events lists are dynamic because their filters live in the query string (~0.2–0.4 s server time).
- **PWA:** hand-written `public/sw.js` (no dependency). Guide/toolkit/blog/safety pages are network-first and the last **20** are kept (LRU). Hashed `/_next/static` assets are cache-first so cached pages render. Guide images are cached (max 60). Offline navigations to anything else redirect to `/offline` (a redirect, so the URL matches what the router hydrates), which lists the saved guides. The install step precaches `/offline` *and its own JS/CSS*. The SW never handles admin, API, auth, me, vendor or preview routes, non-GET requests or RSC requests. `/sw.js` is served `no-cache`.
- **Public API `/api/v1` (§9):** reads `cities`, `cities/{slug}/live`, `vendors` (city filters or `q` search), `vendors/{slug}`, `vendors/{slug}/posts`, `events`, `guides`, `leaderboard/{city}`; writes `pulse`, `posts` (text check-in, moderated like the app), `reports`, authenticated with the user's Supabase access token (`Authorization: Bearer`, verified with Supabase Auth, email must be verified, suspended/banned → 403). Envelope `{ data, error, meta }`. Reads are CORS-open and CDN-cached, 300/min/IP (new `apiIp` limit; PRD doesn't specify). Writes use the existing per-user limits. Service errors map to 422/429 by `instanceof` (class names are minified). Documented in `docs/api.md` with curl examples. Photo check-ins stay web-only (the one-image-per-request pipeline).
- **Custom analytics events** (`lib/analytics.ts`, consent-gated, no PII, coarse props only): pulse_submitted, checkin_submitted, official_update_posted, share_clicked (whatsapp/native/copy), map_opened, calendar_added, vendor_submitted, signup_completed, report_submitted, search_performed.
- A DEV-only published sample guide (`sample-lagos-first-weekend`) was added to `dev-sample-content.sql` for QA and Lighthouse. It never goes to PROD (LAUNCH step 13).
- The RLS matrix test was renamed to `tests/rls/matrix.test.ts` to match the PRD's L13 acceptance path.

**L15 (2026-10-07)**
- **Launch gap fixed:** PROD would have had no cities, areas or categories. That reference data only lived in `seed.sql`, which also adds fictional venues and is (correctly) banned on PROD. The seed is now split into `supabase/seed/reference.sql` (PROD-safe and idempotent: settings defaults, categories, 6 cities, 40 areas, toolkit drafts, national emergency numbers; **no venues**) and `seed.sql`, which is `\ir reference.sql` + the sample venues (DEV). DEV re-seeded with identical results. A test guards that `reference.sql` never contains venues.
- **/content loader** (`scripts/seed-content.ts` → `lib/services/content-loader.ts`): CSVs for venues / prices / events, markdown with front matter for guides / toolkit / blog / safety pages, `## section | Title` markdown for safety entries, images re-encoded through `processImage` one at a time. Validate-everything-first (any error → nothing written). Idempotent (slug, or city + section + title). Never touches claimed venues. Doesn't overwrite existing guides or safety entries unless `--overwrite`, so CMS edits survive. Writes require `--confirm=<project-ref>` matching the target (guards against the wrong env file). One `content.loaded` audit entry per run. The format is documented in `content/README.md`, with a full valid example set in `content/_examples/` (ignored by default; examples are drafts).
- Small parsers with no new dependencies: front matter (`lib/content/frontmatter.ts`), RFC 4180 CSV (`lib/content/csv.ts`), opening-hours syntax such as `mon-fri 18:00-02:00; sat,sun 12:00-04:00; sun closed` (`lib/content/hours-syntax.ts`).
- **Remote smoke:** `tests/smoke/global-setup.ts` writes the storage state (consent pre-chosen, plus Vercel's preview-bypass cookie, fetched once via the documented query parameters so the secret is never sent as a header to Supabase or Mapbox). Consent tests keep the bypass cookie. `npm run smoke:remote` (full, Preview + DEV) and `npm run smoke:readonly` / `--grep @readonly` (PROD-safe).
- `scripts/promote-migrations.md`: exact PROD DB steps (link, dry run, push, reference data, verification SQL for cron jobs, buckets, the Realtime policy, RLS and exposed schemas).

**P1 (2026-10-07)**
- `0047`: `private.agent_api_keys` exactly as §6.24 (scopes checked against the four allowed values; `ip_allowlist cidr[]`; `expires_at` default now() + 90 days). Service-role-only RPCs `admin_create_agent_key`, `admin_list_agent_keys`, `admin_revoke_agent_key`, `admin_verify_agent_key(hash, ip)`. The last does the CIDR match in Postgres (`inet <<= any(cidr[])`) and stamps `last_used_at` only on a usable call.
- Keys look like `dk_<8 hex>_<32 base64url>`. Only the SHA-256 and the `dk_<8 hex>` prefix are stored, and the plaintext is shown once in Settings. Creating or revoking needs super_admin **plus a fresh MFA code (≤ 5 min)**, the same as role changes. `read` is always granted, and `pii:read` is off by default with a warning beside it.
- Pipeline (`lib/agent/handler.ts`): header → verify → 401/403 → **120 req/min/key** (`agentKey`) → scope → handler → envelope. Every call is audited (`agent.get` / `agent.post`, `actor_role = 'agent'`, `actor_id` null, key id and owner in `after`). Tasks and notes go through new `createTaskAs` / `addNoteAs` (the session versions delegate to them, so behaviour is unchanged) and are attributed to the key's creator.
- One endpoint registry (`lib/agent/registry.ts`) generates both `/schema` (which also says what *this* key may call) and `/openapi.json` (OpenAPI 3.1, returned bare so tools can load it).
- Data rules: verification documents are never returned (only `has_business_doc` / `has_id_doc`); IP/UA are stripped from audit timelines; email + `network_informational` only with `pii:read`. No moderation, sanction, publish or settings writes exist on this API.
- Docs: `docs/agent-api.md` (scopes, errors, every endpoint, curl examples, what an agent can't do).

**P2 (2026-10-07)**
- `0048`: `lists (id, owner_id, title, city_id, is_public, share_token, view_count, …)` and `list_items (id, list_id, vendor_id null, event_id null, note, sort_order, …)` as specified, with exactly one of venue/event per item, no duplicates per list, **20 lists/user and 50 items/list enforced by trigger**, and audit triggers. `share_token` = 12 URL-safe random characters generated by the database (`gen_random_bytes`): nanoid-equivalent, and since it's not in the column grants, clients can't choose or change it.
- RLS: lists and items are owner-only (verified users can create). Nothing about other people's lists is selectable, not even public ones. The share page reads through `get_shared_list(token)` (SECURITY DEFINER; public lists only, exact token, only published venues/events, owner username/display name only), so public lists can't be enumerated. Views are counted server-side through a service-role RPC, at most once per IP per list per hour; view-only updates don't touch `updated_at` or the audit log (`0049`).
- **`0050` security fix found by the RLS matrix:** the project's default privileges still gave `anon`/`authenticated` TRUNCATE/REFERENCES/TRIGGER on every new `public` table (and on future pg_partman partitions). The defaults are removed for `postgres`-owned tables, existing tables are cleaned, and the matrix now asserts that no API role holds those privileges and that no default grants exist.
- Titles and notes can become public, so they go through the same text moderation as posts (blocklist + OpenAI) and are refused at the auto-block threshold. Making a list public re-checks everything that becomes visible. New `listWriteUser` limit 120/h.
- UI: "Add to my night" on venue and event pages and on every venue and event card (a compact button *outside* the card link — no nested interactive elements). The sheet loads only when opened; visitors are sent to sign in. `/me/lists` (create, open) and `/me/lists/[id]` (rename, public toggle with optimistic UI, share URL + WhatsApp/native/copy, notes, move up/down, remove, delete). `/l/[token]`: ISR 60 s (revalidated on every edit), map of venues, **cost estimate** (sum of each venue's cheapest–dearest listed price plus event ticket prices; free events count as priced; unpriced items counted and called out; "check with venues"), WhatsApp share, OG image, `noindex,follow`. Robots doesn't block `/l/`, so WhatsApp/Facebook previews still work.
- Analytics: `list_created`, `list_item_added`, `list_shared`.

**P3 (2026-10-07)**
- **Schema decision (flag for review):** PRD P3 says the tables are "as v1.0 §6.20", but v1.0 isn't in the repo (the current §6.20 is `point_events`). The tables are named exactly as the PRD says, and the columns are my design, built around the listed features (ask / answer / upvote / accept, venue badge, pinned seeds, moderation). See open question 10.
  - `qa_questions (id, vendor_id null, city_id, author_id, title 10–140, body ≤ 1000, status post_status, moderation_decision, moderation_score, is_pinned, accepted_answer_id, answer_count, report_count, created_at, updated_at, deleted_at)`. `city_id` is derived from the venue when one is given.
  - `qa_answers (id, question_id, author_id, body 2–1000, status, moderation_decision, moderation_score, is_vendor_answer, is_official, vote_count, report_count, …)`.
  - `qa_votes (answer_id, voter_id)`: upvote only, never on your own answer.
- **Moderation applies:** rows are inserted `pending` by the user's own client (verified users, RLS). The server then runs the same text moderation as posts (blocklist + OpenAI): pass → published; flag → published + P3 queue item; block → hidden + P1 queue item; moderation unavailable → treated as a flag. Q&A items in `/admin/moderation` now show their text and get the full action set: approve publishes; remove ± warn/suspend/ban removes, resolves reports and sanctions; shadowban works too. Q&A can be reported (`0051` adds `qa_question` / `qa_answer` to `report_entity`). Three open reports auto-hide and bump the item to P1. Shadowbanned authors' Q&A is invisible to others (same as posts).
- **Badges and integrity:** `is_vendor_answer` is computed by trigger (author is an accepted member of the question's venue) and shows a "Venue" badge. `is_official` and `is_pinned` are staff-only. Column grants stop API callers from setting status, pins, badges or authors (`0053` removed a redundant trigger guard that wrongly reverted trigger-driven auto-hides). Only the asker can accept, and only a published answer to that question. Answers sort accepted → official → venue → votes. Community answers carry the "Unverified — posted by a community member" label.
- **Pinned seeds:** admins write them in `/admin/qa` (question + optional official answer, auto-accepted). They render first on the city or venue Q&A.
- **Pages:** a Q&A section on every venue page; `/c/[city]/questions` (linked from the city page); `/q/[id]` (shareable, with schema.org `QAPage` JSON-LD, noindex until answered). All ISR 60 s and revalidated on writes; viewer state (your votes, accept buttons) loads after hydration. `/admin/qa` (moderator+; seeds admin+): status tabs, publish / hide / remove (reason required) / pin, all audited. Feature-flagged by `FEATURE_QA`.
- Limits (PRD doesn't specify): ask 5/h, answer 20/h, vote 120/h per user.
- **DEV auth rate limits:** DEV allows 30 token verifications (MFA verifies included) per 5 minutes per IP, and one full smoke run does about 16. Back-to-back `npm run verify` runs within 5 minutes can therefore fail on MFA/sign-in steps (stuck on `/admin/mfa`). Space runs ≥ 5 minutes apart; I haven't changed any Supabase auth setting.
- **Test-harness note:** the smoke runner now clears `.next/cache/fetch-cache` first. Next.js caches Supabase GETs on disk per route revalidate window and keeps them across rebuilds, so one run's data could leak into the next.

**P4 (2026-10-08)**
- **Schema decision (open question 10, as for P3):** PRD P4 points at "v1.0 §6.19", which isn't in the repo. The tables are named as the PRD says.
  - `itineraries (id, slug, title, city_id null, days 1–14, excerpt, intro_md, cover_image_url, status guide_status, seo_title, seo_description, published_at, created_by, updated_by, timestamps, deleted_at)`.
  - `itinerary_items (id, itinerary_id, day, sort_order, time_label, title, vendor_id null, event_id null, description_md, cost_ngn null (per person), cost_note, timestamps)`.
  - RLS: published only for API roles (admins with aal2 see drafts). All writes go through the admin CMS (service role, audited by trigger + explicit audit).
- Money maths lives in one pure module (`lib/itineraries/totals.ts`) used by the public page, the CMS preview and the tests. Costs are per person in whole naira. £/$ use `fx_gbp_per_ngn` / `fx_usd_per_ngn` from Admin → Settings and are offered only when set; they're rounded to whole units, with a note that bank rates differ. The chosen currency is remembered per device.
- Page: `/itineraries` index and `/itineraries/[slug]` (ISR 300 s, revalidated on save/publish): day tabs, stops with time, venue link, cost and note, a sticky totals bar (day subtotal, running total, whole trip), share buttons, OG image, TouristTrip JSON-LD. Linked from `/guides`; in the sitemap.
- DEV only: sample FX rates (£0.00048 / $0.00065 per ₦) added to `dev-sample-content.sql` so the toggle can be QA'd. PROD sets real rates in Admin → Settings.

**P5 (2026-10-08)**
- **Groq model:** `llama-3.3-70b-versatile` is **retired** (Groq deprecations: shutdown 16 Aug 2026, replacement `openai/gpt-oss-120b` or `qwen/qwen3.6-27b`; the Qwen one was itself retired on 14 Sep 2026, and the live `/models` list no longer has the Llama model). I use **`openai/gpt-oss-120b`** with low reasoning effort. `resolveGroqModel()` maps the retired ID still in `GROQ_MODEL` to the replacement, so nothing breaks; set `GROQ_MODEL=openai/gpt-oss-120b` on PROD (LAUNCH step 15).
- Wiring: `ai` + `@ai-sdk/openai` (both approved) with `createOpenAI({ baseURL: "https://api.groq.com/openai/v1" }).chat(model)`, which is Groq's OpenAI-compatible endpoint (no OpenAI call is made, and the OpenAI key stays moderation-only). Streaming: the route returns a plain text stream, read by a small client (no `@ai-sdk/react`, which isn't approved).
- **Context assembly:** city (picked, or named in the question), live summary (crowd label, confidence, post counts), per-keyword full-text search top 15, category intent from the question (rooftop / club / suya / beach / …), venues in areas named in the question, a fallback to the city's most active listings, listed prices (up to 3 per venue) and this week's events. Capped at 25 venues.
- **Guardrails:**
  - The model must name venues only as `[[slug]]` tokens from the context. The UI links a token only if the server offered that slug (sent in a header), and unknown tokens render as plain text, so invented venues can never become links.
  - No prices outside the context.
  - Safety, road, crime and health questions never reach the model: a fixed reply links `/safety/[city]` + 112, and the system prompt repeats the rule as a backstop.
  - Questions are text-moderated first (blocklist + OpenAI). Never promises action by anyone.
- **Logging:** `private.assistant_logs` (`0055`; service role only; question ≤ 500 chars, answer ≤ 4000, outcome, venues linked, model, latency), purged after 30 days by the daily purge job. The privacy policy now lists Groq as a processor and the 30-day retention.
- UI: `/assistant` ("Ask" in the header when `FEATURE_AI_ASSISTANT` is on): city picker, example questions, streamed answers, and a disclaimer (AI can be wrong; community data; not for emergencies — 112). `noindex`.

**U1 (2026-10-08) — UX/UI upgrade** (audit and per-screen status: `docs/ux-audit.md`)
- **Design system:**
  - type scale tokens: `caption` 12px is the floor everywhere; then `footnote`, `callout`, `title`, `display`;
  - motion tokens: 120/180/340/220ms, ease-out, plus `linear()` springs with a cubic-bezier fallback;
  - one global 2px `:focus-visible` ring, and `prefers-reduced-motion` respected everywhere;
  - `.pressable` touch-down scale, `.hit` 44px hit-area expander, `.surface` cards, `.rail` snap scrollers;
  - custom checkbox/radio/select styling.
  - All of it is CSS: no new dependencies. framer-motion and `tailwindcss-animate` are still not used.
- **New primitives** in `components/ui/`:
  - Skeleton, EmptyState, chip helpers, SegmentedControl (roving focus), SegmentedLinks, Switch (a native checkbox, so forms and tests keep working);
  - Breadcrumbs, BackLink, ListGroup/ListRow, Progress, Select, ConfirmSheet;
  - `lib/client/deferred.ts`: Undo toasts with a 5s deferred commit, committed on `pagehide`.
- **Sheet:** grabber; drag-to-dismiss that tracks the finger 1:1, rubber-bands upward and keeps the release velocity into the exit; sticky header and footer; spring entrance.
- **Navigation:**
  - phone-only bottom tab bar (Tonight · Events · Ask · Saved · Me/Sign in) as `nav "Primary"`;
  - on phones the header slims to logo + search; on desktop it keeps Events/Guides/Ask/account;
  - breadcrumbs on venue, event, question, Me, lists and itinerary pages; toasts move to the bottom, above the tab bar.
- **Screens:**
  - Home/City: search under the hero; a single live venue gets a wide card; sticky scroll-spy Tonight · Places · Questions nav; compact directory rows on phones (city page 6.8 → 4.3 screens).
  - Venue:
    - Directions is the primary action, other actions sit in a grid (nothing clipped), and Save/Share/Copy share one row;
    - the pulse bar is primary, with check-in for details;
    - a sticky compact title, a "Today" row in opening hours, and event rows that link out.
  - Check-in sheet:
    - the button explains what's missing instead of looking broken;
    - wait, fee and note sit behind "More details"; photo thumbnails;
    - ₦-prefixed fee field and a location switch.
  - Events/December: the city picker is a sheet and the List/Month view is a segmented control; rolling countdown digits; whole month-grid cells are tappable; EmptyStates; "Add to my calendar" buttons; a sticky Tickets bar on event pages.
  - Itinerary: segmented currency control with arrow-key navigation; day tabs with swipe between days and directional slides; amounts that roll in; a slimmer sticky totals bar ("So far" only from day 2).
  - Assistant: chat bubbles, typing dots, a composer pinned above the tab bar that grows with the text, "New reply" pill, per-answer disclaimer.
  - Auth:
    - inline email validation on blur, with one error slot so a message never shows twice;
    - show/hide password (its accessible name is "Show"/"Hide", so it doesn't collide with the "Password" label);
    - a live password checklist and a 60s resend cooldown.
  - Me/settings/lists/posts:
    - grouped list rows and a tappable avatar (the file input is now labelled);
    - switches for settings;
    - the list editor has a real `<h1>` with inline rename, and Undo on remove;
    - a ConfirmSheet replaces `window.confirm`, and post delete has Undo.
  - Q&A: `<h1>` on `/q/[id]`; ask form in a sheet with a counter and inline validation; accepted answer marked; "Helpful" votes.
  - Vendor: a real listing checklist (6 items linking to steps) instead of a bare %; a "Step N of 6" segmented progress bar; ₦ price fields with Undo; an official-update preview; verification requirements up front.
  - Admin (by a helper agent; same rules): grouped sidebar on desktop and chip rail on phones; responsive cards/table in the data table; 44px filters and forms; KPI tiles; MFA steps with copy-secret.
- **Deliberate deviations** (details in `docs/ux-audit.md` §6):
  - **No route-level `loading.tsx`.** Under a Suspense boundary, `notFound()`/`redirect()` stream a 200, and `/search` rendered its results twice.
  - **City sections scroll in place rather than hiding behind tabs**, for SEO, no-JS use and the existing tests.
  - **Not built:** drag-reorder, swipe-to-delete and the leaderboard "you" row. They would need new data or endpoints.
- **Tooling:**
  - `next.config.ts` honours an optional `NEXT_DIST_DIR`, so a second dev or verify server can run beside `npm run dev`. `scripts/run-smoke.mjs` and the bundle-secret unit test read the same variable, and `.next-*/` is git-ignored.
  - Measured result at 390px: undersized targets per page fell from 20–48 to 1–5, text under 12px fell to 0, and every page has exactly one h1.
- **DEV auth limit, again:** three back-to-back verifies in ~30 minutes hit the 30-verifications/5-min DEV limit (logins stuck on `/login` and `/admin/mfa`). Spacing the run fixed it, as noted under P3.

## Open questions for Fola
(write here when you need me)

1. **[non-blocking] `npm audit` dev-only highs.** The production dependency tree is clean (`npm audit --omit=dev` → 0). The full tree still reports 7 high from GHSA-vfj7-8cjw-p6xm in `braces` ≤ 3.0.3, which has **no patched release**. It arrives only through build tooling: Tailwind 3 (chokidar/micromatch/fast-glob) and `eslint-config-next` (fast-glob). Nothing user-facing ever reaches it. The only "fix" is moving to Tailwind 4, which the PRD rules out (§2 says Tailwind 3). I'm treating §7.11's "zero high/critical" as the shipped (production) tree and re-checking at every stage. Tell me if you'd rather move to Tailwind 4. *(L13 update: the dev tree also shows a moderate `postcss-selector-parser` < 7.1.6 advisory via Tailwind 3. It's build-time only and parses our own CSS. Same situation, same recommendation.)*
2. **[non-blocking] `EMAIL_ADMIN_TO` is empty** in `.env.local` (`RESEND_API_KEY` is also empty — known, per CLAUDE.md). Until it's set, admin notification emails will fall back to `SUPER_ADMIN_EMAIL`, and email sending stays a no-op while there's no Resend key.
3. **[optional] `tailwindcss-animate`** (shadcn's animation plugin for Tailwind 3) isn't in PRD §4, so it isn't installed. Dialogs/sheets will open without enter/exit animations. Approve it if you want those animations.
4. **[needs your OK — secrets] Storage purges need the service key in Supabase Vault.** PRD §6.7/§7.12/§8.4 require pg_cron to delete expired uploads (24 h), verification documents (30 days after decision) and deleted users' media. Supabase now blocks deleting storage objects with SQL (`protect_objects_delete`), so the job has to call the Storage API, and for that the database needs the service-role key, stored encrypted in **Supabase Vault** as `app_service_role_key` (plus `app_project_url`). That's a new place for a secret, beyond §7, so I haven't stored it. Everything is built: until the secrets exist the purge jobs delete nothing, raise a warning, and never falsely mark documents as purged. **Reply "OK to store in Vault"** and I'll add `npm run db:vault` (it reads the key from `.env.local` and pipes it to psql over stdin, so it never appears in shell history or process args) and run it on DEV. The alternative is a Vercel cron route doing the deletes with the service key it already holds. That's also outside the PRD's "digest + backup only" Vercel crons.
5. **[heads-up, non-blocking] Signups on DEV only work for Supabase team-member emails** until custom SMTP (Resend) is configured: the built-in sender rejects every other address with `email_address_invalid`, and caps at 2 emails/hour. The app shows a friendly message, and the tests avoid email (CLAUDE.md). When you set up SMTP, please also update the four email templates listed in LAUNCH.md §8, so confirmation links work when opened on a different device.
6. **[heads-up] MFA recovery:** Supabase TOTP has no backup codes. If an admin loses their phone, a super admin has to remove the factor in the Supabase dashboard (Authentication → Users → user → MFA). I'd suggest enrolling a second authenticator (e.g. a password-manager TOTP) on your super-admin account. I'll mention this in LAUNCH.md.
7. **[content needed before launch] Verified safety information.** The safety pages only show the national numbers (112, FRSC 122) and LASEMA 767 from the PRD, all marked "not yet verified". Hospitals with 24 h A&E, police stations, embassies, travel advice, area notes and scam-awareness text need real, checked information per city. I won't invent emergency contacts. Add them in **Admin → Safety info** (`/admin/safety`, built in L12) or via the L15 content loader, ticking "checked against the official source today" when verified.
8. **[before launch — legal] Privacy policy and terms are templates.** I rewrote them in L13 to match exactly what the product does (processors, retention, NDPA/UK rights, cookies), but they need a lawyer's review. Two product points to confirm: (a) the service is **18+** (I assumed this for a nightlife product), and (b) the contact address. Set `NEXT_PUBLIC_CONTACT_EMAIL` in Vercel; it defaults to `hello@` the production domain.
9. **[needed for one L15 check] Vercel preview bypass for automated tests.** Preview deployments are behind Vercel Authentication (they redirect to Vercel SSO), so Playwright can't reach them. To run the full smoke suite on a Preview against DEV, enable **Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation** and add the generated value to `.env.local` as `VERCEL_AUTOMATION_BYPASS_SECRET`. Then `PLAYWRIGHT_BASE_URL=<preview-url> npm run smoke:remote`. Everything else is in place, and the same suite is green against a local production build on DEV. (Alternatively, turn deployment protection off for Previews; I haven't changed any Vercel security setting.)
10. **[review, non-blocking] Q&A columns.** PRD P3 says the Q&A tables are "as v1.0 §6.20", but v1.0 isn't in the repo (the current §6.20 is `point_events`). I named the tables exactly as the PRD says and designed the columns around the features it lists (details in Notes → P3). If v1.0 had a different shape you want kept, send it and I'll write a follow-up migration. P4 itineraries reference "v1.0 §6.19" the same way, and I'll handle it the same way.

