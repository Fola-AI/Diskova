# Build Progress

## Current stage
Stage L11 — Safety information section and private issue reports

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

## Open questions for Fola
(write here when you need me)

1. **[non-blocking] `npm audit` dev-only highs.** The production dependency tree is clean (`npm audit --omit=dev` → 0). The full tree still reports 7 high from GHSA-vfj7-8cjw-p6xm in `braces` ≤ 3.0.3, which has **no patched release**. It arrives only through build tooling: Tailwind 3 (chokidar/micromatch/fast-glob) and `eslint-config-next` (fast-glob). Nothing user-facing ever reaches it. The only "fix" is moving to Tailwind 4, which the PRD rules out (§2 says Tailwind 3). I'm treating §7.11's "zero high/critical" as the shipped (production) tree and re-checking at every stage. Tell me if you'd rather move to Tailwind 4.
2. **[non-blocking] `EMAIL_ADMIN_TO` is empty** in `.env.local` (`RESEND_API_KEY` is also empty — known, per CLAUDE.md). Until it's set, admin notification emails will fall back to `SUPER_ADMIN_EMAIL`, and email sending stays a no-op while there's no Resend key.
3. **[optional] `tailwindcss-animate`** (shadcn's animation plugin for Tailwind 3) isn't in PRD §4, so it isn't installed. Dialogs/sheets will open without enter/exit animations. Approve it if you want those animations.
4. **[needs your OK — secrets] Storage purges need the service key in Supabase Vault.** PRD §6.7/§7.12/§8.4 require pg_cron to delete expired uploads (24 h), verification documents (30 days after decision) and deleted users' media. Supabase now blocks deleting storage objects with SQL (`protect_objects_delete`), so the job has to call the Storage API, and for that the database needs the service-role key, stored encrypted in **Supabase Vault** as `app_service_role_key` (plus `app_project_url`). That's a new place for a secret, beyond §7, so I haven't stored it. Everything is built: until the secrets exist the purge jobs delete nothing, raise a warning, and never falsely mark documents as purged. **Reply "OK to store in Vault"** and I'll add `npm run db:vault` (it reads the key from `.env.local` and pipes it to psql over stdin, so it never appears in shell history or process args) and run it on DEV. The alternative is a Vercel cron route doing the deletes with the service key it already holds. That's also outside the PRD's "digest + backup only" Vercel crons.
5. **[heads-up, non-blocking] Signups on DEV only work for Supabase team-member emails** until custom SMTP (Resend) is configured: the built-in sender rejects every other address with `email_address_invalid`, and caps at 2 emails/hour. The app shows a friendly message, and the tests avoid email (CLAUDE.md). When you set up SMTP, please also update the four email templates listed in LAUNCH.md §8, so confirmation links work when opened on a different device.
6. **[heads-up] MFA recovery:** Supabase TOTP has no backup codes. If an admin loses their phone, a super admin has to remove the factor in the Supabase dashboard (Authentication → Users → user → MFA). I'd suggest enrolling a second authenticator (e.g. a password-manager TOTP) on your super-admin account. I'll mention this in LAUNCH.md.

