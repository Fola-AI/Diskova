# PRD.md — Diskova (working name) · Web Platform v1

Owner: Fola (Algoscape Innovations Ltd)
Builder: Claude Code, auto mode, following CLAUDE.md
Target: public web launch before mid-November 2026 (ahead of the December travel season)
Document version: 2.0 · 7 October 2026 (post-audit)

Changes from v1.0: separate DEV/PROD databases; custom SMTP; `private` schema for admin
views; video disabled by default; CGNAT-aware rate limits; append-only audit enforced by
trigger + revoke; cold-start mechanics (official updates weighted, one-tap pulse, points);
pg_cron replaces Vercel cron for crowd jobs; one-image-per-invocation pipeline; Realtime only
for authenticated users; media holds for low-trust/new accounts; shadowban denormalised;
NDPA 2023; ID document purge; agent API hardened; stages split into Launch / Post-launch;
test evidence required per stage.

---

## 1. Product definition

### 1.1 One sentence
A real-time "what's happening right now" platform for anyone going out in, or travelling to, Nigeria — live crowd levels and photos from venues, a December events calendar, honest prices, curated city guides, and a diaspora toolkit — in one place, instead of scrolling Instagram.

### 1.2 What it is NOT
- NOT a booking platform. No hotel, flight, table or ticket booking. Vendor pages may show an external "Book / Contact" link that leaves the site.
- NOT a payments product at launch. Listing is free. No Paystack/Stripe in v1.
- NOT a public security/incident feed. See §10 (Safety).
- NOT a social-media scraper. Content comes from (a) users posting directly on the platform and (b) vendors' own authorised feeds (optional, Stage P6).
- NOT a reviews site. No star ratings or written reviews of vendors — crowd level and vibe only. This is a deliberate defamation-risk decision.

### 1.3 Users
| Persona | Need | Primary surface |
|---|---|---|
| Local going out tonight | "Where's the vibe right now? Is Club X packed? What's the entry fee?" | Tonight view, heat map, vendor live page |
| Diaspora visitor planning ahead | "What's on in December? Visa, SIM, airport, first 48 hours?" | December calendar, guides, diaspora toolkit |
| Vendor (club, restaurant, beach, cinema, promoter, attraction) | "Get discovered for free, post live updates, show prices, get verified" | Vendor dashboard |
| Moderator | "Review flagged content fast, sanction bad actors" | Admin → Moderation |
| Super admin (Fola) | "See everything, filter everything, block anyone; later, ask an AI agent what's going on" | Admin back office + Agent API (P1) |

### 1.4 Launch cities
Lagos, Ibadan, Abuja, Port Harcourt, Aba, Owerri. Each city has named areas. The data model supports adding cities/areas from the admin without code changes.

### 1.5 Brand
- `BRAND_NAME` read from `NEXT_PUBLIC_BRAND_NAME` (default `Diskova`). All copy, metadata, emails and OG images read from it.
- Season naming: always "December in Nigeria". Never "Detty December" (third-party trademark).
- Visual direction: photo-first, dark-mode default, high contrast, Nigerian-green accent `#0B7A3B`, warm gold `#F4B400`. `Inter` for UI, `Fraunces` for display headings. Must look premium in a phone screenshot.

### 1.6 Cold-start strategy (built into the product, not just marketing)
The platform is only valuable when venues show live data. Three mechanics ensure a vendor page can be "alive" with zero users:
1. **Official updates** — a vendor member can post a crowd level + photo from their dashboard in two taps. Official posts carry weight ×3 in crowd aggregation and are labelled "Official".
2. **One-tap pulse** — any verified user can submit crowd level only (no photo, no text) in one tap from the vendor page. Lowest friction possible.
3. **Points and the December leaderboard** — users earn points for check-ins (more if at-venue, more with photo), vendors earn points for official updates. City leaderboards reset monthly; a "December in Nigeria" leaderboard runs 15 Nov–10 Jan. Badges (Explorer, Night Owl, First-in) shown on profile. No cash value.

### 1.7 Success metrics (admin dashboard)
Vendors registered / verified; official updates per day; check-ins per day per city; unique and returning visitors; auto-flagged vs human-actioned, median moderation time; guide page views.

---

## 2. Tech stack (decided — do not deviate)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict | Vercel-native, SSR for SEO |
| Styling | Tailwind CSS 3, shadcn/ui, lucide-react | No other UI/chart libraries |
| Database | Supabase Postgres + PostGIS, **two projects: DEV and PROD** | Claude Code only touches DEV |
| Scheduled jobs | **pg_cron inside Supabase** for crowd snapshot (5 min), forecast (nightly), purges | Set-based SQL; no serverless timeouts; no Vercel cron dependency |
| Auth | Supabase Auth: email+password, magic link, Google; TOTP MFA for admin roles; **custom SMTP via Resend** | Built-in SMTP is dev-only and rate-limited |
| Storage | Supabase Storage buckets: `media-incoming` (private), `media` (public), `vendor-assets` (public), `verification-docs` (private), `guides` (public) | |
| Realtime | Supabase Realtime for **authenticated** users only; anonymous visitors poll a cached JSON route every 30 s | Protects connection limits |
| Maps | Mapbox GL JS v3, **lazy-loaded** behind the map toggle | Static preview image on first paint |
| Email | Resend + React Email | Also used as Supabase SMTP |
| Moderation | OpenAI Moderation API `omni-moderation-latest` (text + images) | Free |
| In-app AI (P5) | Groq `llama-3.3-70b-versatile` | Free tier |
| Rate limiting | Upstash Redis + `@upstash/ratelimit` | Per-user keys primary |
| Image processing | `sharp`, one image per invocation | |
| Validation | `zod` | |
| Errors / analytics | Sentry; Vercel Analytics + Speed Insights | |
| Hosting | Vercel (Pro required at launch: commercial use terms) | |
| Testing | Vitest (unit + RLS matrix), Playwright (smoke) | `npm run verify` runs all |
| Mobile (later) | Flutter on the same Supabase project + `/api/v1` | Out of scope |

Content drafting with Claude happens OUTSIDE the app. No Anthropic key in the app.

### 2.1 `npm run verify`
Defined in Stage L1 as: `next build && next lint && tsc --noEmit && vitest run && playwright test --project=smoke` (Playwright only from L3 onward; before that it is skipped with a clear message). This is the gate for every stage.

---

## 3. Architecture

```
Browser / PWA
   │
   ▼
Next.js on Vercel ──► Server Actions / Route Handlers ──► /lib/services/* ──► /lib/db (user client, RLS)
                                                                          └► /lib/admin-db (service role, server-only)
   ├─ /app/api/v1/*         public JSON API (Flutter later)
   ├─ /app/api/live/*       cached JSON for anonymous polling (ISR 30 s)
   ├─ /app/api/media/process one image per call
   ├─ /app/api/cron/*       daily digest + weekly backup only (Vercel cron, daily/weekly)
   ├─ /app/api/agent/v1/*   Stage P1
   └─ /app/api/webhooks/*
   │
   ├─► Supabase DEV (build) / PROD (Fola promotes) — Postgres, PostGIS, pg_cron, Auth, Storage, Realtime
   ├─► Mapbox (client, lazy)  ├─► OpenAI Moderation  ├─► Groq (P5)
   ├─► Upstash Redis          ├─► Resend              └─► Sentry
```

### 3.1 Folder structure
```
/app
  /(public)   /, /c/[city], /v/[slug], /events, /events/december, /guides, /toolkit, /blog,
              /safety, /search, /leaderboard, /u/[username]
  /(auth)     /login, /signup, /verify, /reset
  /(user)     /me, /me/posts, /me/settings
  /(vendor)   /vendor, /vendor/onboarding, /vendor/profile, /vendor/update (official post),
              /vendor/events, /vendor/prices, /vendor/verification, /vendor/qr
  /(admin)    /admin/* (§11)
  /api/v1 · /api/live · /api/media · /api/cron · /api/agent (P1) · /api/webhooks
/components   ui/, map/, feed/, vendor/, admin/, forms/
/lib          config.ts, db/, admin-db/, services/, auth/, moderation/, crowd/, media/,
              ratelimit/, ai/, email/, validation/, points/
/supabase     migrations/, seed/, functions/ (SQL functions for pg_cron)
/scripts      create-super-admin.ts, seed-content.ts, promote-migrations.md (manual steps)
/tests        unit/, rls/, smoke/
/content      (Fola's real content, loaded by seed-content.ts in L15)
```

### 3.2 Feature flags (`/lib/config.ts`, all from env)
`FEATURE_INSTAGRAM_FEED` (default false) · `FEATURE_VIDEO` (default false) · `FEATURE_AI_ASSISTANT` (default true, used from P5) · `FEATURE_CROWD_FORECAST` (default true) · `FEATURE_QA` (default true, used from P3) · `FEATURE_POINTS` (default true).

---

## 4. Approved dependencies (install only these)

Runtime: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `tailwindcss`, `postcss`, `autoprefixer`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/*` (via shadcn), `mapbox-gl`, `react-map-gl`, `sharp`, `blurhash`, `resend`, `@react-email/components`, `@upstash/redis`, `@upstash/ratelimit`, `@sentry/nextjs`, `@vercel/analytics`, `@vercel/speed-insights`, `@vercel/og`, `date-fns`, `date-fns-tz`, `slugify`, `nanoid`, `openai` (moderation only), `groq-sdk` (P5), `ai` + `@ai-sdk/openai` (P5), `react-hook-form`, `@hookform/resolvers`, `sonner`, `next-themes`, `qrcode`, `isomorphic-dompurify`, `otplib` (only if Supabase MFA UI needs a helper; prefer Supabase's built-in).

Dev: `typescript`, `@types/*`, `eslint`, `eslint-config-next`, `prettier`, `vitest`, `@playwright/test`, `supabase` (CLI), `tsx`, `dotenv-cli`.

Anything else → STOP and ask.

---

## 5. Roles and permissions

| Role | Can |
|---|---|
| `anon` | Read all published content, Tonight view (polled), map, guides, events. Cannot post. |
| `user` (email verified) | Check-ins, pulse, report content, claim a vendor, earn points. |
| `vendor_member` | Everything `user` can + manage their vendor(s): profile, prices, events, official updates, dispute posts on their page. |
| `moderator` | Admin → Moderation, Reports, Users (view, warn, suspend, shadowban). MFA required. |
| `admin` | Moderator + Vendors (verify/reject/suspend), Content CMS, Events, Cities, Audit log (read), Safety. MFA required. |
| `super_admin` | Everything + Roles, Settings, Agent keys, user CSV export, data export. MFA required. |

Role in `profiles.role`; vendor membership in `vendor_members`. Server-side guards in `/lib/auth/guards.ts`: `requireUser()`, `requireRole(role)`, `requireVendorMember(vendorId)`. `requireRole` for any admin role also requires `aal2`. RLS policies for admin tables additionally check `(auth.jwt() ->> 'aal') = 'aal2'`.

---

## 6. Data model — implement exactly, in this order

Conventions: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at` with trigger. Soft delete `deleted_at`. RLS on every table. Extensions: `postgis`, `pg_trgm`, `unaccent`, `citext`, `pg_cron`.
Schemas: `public` (exposed) and **`private` (not exposed to PostgREST; service-role only)**. Admin views, `audit_log` reads, `issue_reports`, `verification` documents metadata and `agent_api_keys` live in `private`.

### 6.1 `cities`
`id, slug unique, name, state, country default 'NG', centroid geography(point), bbox geography(polygon), timezone default 'Africa/Lagos', hero_image_url, intro_md, is_active, sort_order`

### 6.2 `areas`
`id, city_id, slug, name, centroid, polygon null, is_active, sort_order` · unique(city_id, slug)

### 6.3 `categories`
`id, slug unique, name, group enum('nightlife','food_drink','daytime','culture','events','stay_adjacent'), icon, sort_order`
Seed: nightclub, lounge, bar, rooftop, restaurant, cafe, street_food, beach, resort, amusement_park, cinema, art_gallery, museum, market, nature, historic_site, concert_venue, event_space, hotel_bar.

### 6.4 `vendors`
`id, slug unique, name, tagline, description_md, category_id, secondary_category_ids uuid[], city_id, area_id, address_line, location geography(point) not null, phone, whatsapp, email, website_url, booking_url, instagram_handle, tiktok_handle, x_handle, cover_image_url, logo_url, gallery jsonb, opening_hours jsonb, price_band enum('free','budget','mid','premium','luxury'), dress_code, age_policy, parking_note, late_night_area_note, features text[], status enum('draft','pending_review','published','suspended','rejected') default 'draft', verified bool default false, verified_at, verified_by, claim_status enum('unclaimed','claimed') default 'unclaimed', owner_profile_id, is_seed bool default false, points int default 0, search_tsv tsvector generated, view_count int default 0, last_activity_at, last_official_update_at, deleted_at`
Indexes: GIST(location), GIN(search_tsv), (city_id,status), (category_id,status).

### 6.5 `vendor_members` — `vendor_id, profile_id, role enum('owner','manager','staff'), invited_by, accepted_at` PK(vendor_id, profile_id)

### 6.6 `vendor_prices` — `id, vendor_id, label, amount_ngn int, note, valid_from, valid_to null, is_active`

### 6.7 `private.vendor_verification_requests`
`id, vendor_id, submitted_by, business_doc_path, id_doc_path, social_proof_url, note, status enum('pending','approved','rejected'), reviewed_by, reviewed_at, rejection_reason, docs_purged_at`
**Purge rule:** pg_cron job daily deletes `business_doc_path` and `id_doc_path` objects from storage and sets `docs_purged_at` 30 days after `reviewed_at`. Rejected requests purge after 30 days too. Only the decision and `docs_purged_at` remain.

### 6.8 `profiles`
`id (= auth.users.id), username citext unique, display_name, avatar_url, bio, home_city_id null, is_diaspora bool null, role enum('user','vendor_member','moderator','admin','super_admin') default 'user', email_verified_at, status enum('active','warned','suspended','banned') default 'active', status_reason, status_until, is_shadowbanned bool default false (denormalised from sanctions by trigger), trust_score int default 50, points int default 0, post_count int default 0, badges text[] default '{}', location_consent bool default false, last_seen_at, deleted_at`
Sensitive columns in `private.profile_meta`: `profile_id pk, signup_ip inet, last_ip inet, signup_ua, device_hash text` (admin read only; informational, never used for automatic sanctions — see §7.10).
Trigger on `auth.users` insert → create profile with generated username. Public view `v_public_profiles` with `security_invoker = true` exposing username, display_name, avatar_url, bio, badges, points, post_count only.

### 6.9 `posts`
`id, author_id, vendor_id, event_id null, kind enum('checkin','pulse','update','official'), body text (max 500, null for pulse), crowd_level smallint (1 empty, 2 chill, 3 busy, 4 packed, 5 at capacity) — required for checkin/pulse/official, vibe smallint null, wait_minutes null, cover_fee_ngn null, location geography(point) null, distance_from_venue_m int null, is_at_venue bool default false (soft signal; distance < 300 m), status enum('pending','published','hidden','removed') default 'pending', hold_reason enum('none','media_new_account','media_low_trust','video') default 'none', verified bool default false, moderation_score jsonb, moderation_decision enum('auto_pass','auto_flag','auto_block','human_pass','human_remove') null, moderated_by, moderated_at, report_count int default 0, like_count int default 0, expires_at (checkin/pulse: now() + settings.checkin_expiry_hours; official/update: now() + 24h), deleted_at`
Indexes: (vendor_id, status, created_at desc), (author_id, created_at desc), (status, hold_reason), GIST(location).
`kind='official'` allowed only if author is `vendor_members` of `vendor_id` (enforced by RLS + check in service).

### 6.10 `post_media`
`id, post_id, storage_path (in `media`), kind enum('image','video'), width, height, duration_s null, blurhash, phash text, moderation_score jsonb, sort_order, processed_at`
Video rows only exist when `FEATURE_VIDEO=true` (P7) and always force `posts.hold_reason='video'`.

### 6.11 `crowd_snapshots` (written by pg_cron every 5 min)
`vendor_id, bucket_start, crowd_level_avg numeric, crowd_level_mode smallint, vibe_avg numeric, post_count int, official_count int, at_venue_count int, confidence enum('low','medium','high')` PK(vendor_id, bucket_start)
Weighting (SQL function `private.refresh_crowd_snapshots()`): base weight by age (<30 min = 1.0, 30–60 = 0.6, 60–90 = 0.3) × kind (official ×3, at_venue ×2, otherwise ×1). Excludes posts where `status <> 'published'` or author `is_shadowbanned`. Confidence: weighted sum < 2 low, 2–5 medium, > 5 high. One official update alone yields medium.

### 6.12 `crowd_forecast` (pg_cron nightly 04:00 WAT) — `vendor_id, weekday, hour, crowd_level_expected numeric, sample_size int` PK. Shown once `sample_size ≥ 4`.

### 6.13 `events`
`id, slug unique, title, description_md, vendor_id null, venue_vendor_id null, venue_name_freeform, city_id, area_id, location, starts_at, ends_at, timezone, cover_image_url, category enum('concert','festival','party','beach_party','boat_cruise','comedy','art','food','sport','conference','community','other'), ticket_url, price_from_ngn, price_to_ngn, is_free, is_featured, is_december_season bool (set by BEFORE INSERT/UPDATE trigger from `platform_settings` season dates), status enum('draft','pending_review','published','cancelled','rejected'), submitted_by, approved_by, approved_at, view_count, search_tsv`

### 6.14 `private.audit_log` (append-only)
`id bigserial, at, actor_id null, actor_role, action text, entity_type, entity_id, before jsonb, after jsonb, reason, ip inet, user_agent`
Enforcement: `REVOKE UPDATE, DELETE, TRUNCATE ON private.audit_log FROM PUBLIC, anon, authenticated, service_role;` AND a trigger `private.audit_log_immutable()` that `RAISE EXCEPTION` on UPDATE/DELETE. Inserts only via `private.write_audit()` SECURITY DEFINER function. Admin UI reads via admin-db.

### 6.15 `reports` — `id, reporter_id, entity_type enum('post','vendor','event','profile'), entity_id, reason enum('fake','spam','abuse','dangerous','wrong_venue','rival_sabotage','copyright','other'), details, status enum('open','reviewing','resolved_removed','resolved_kept','dismissed'), assigned_to, resolved_by, resolved_at, resolution_note` · unique(reporter_id, entity_type, entity_id)

### 6.16 `moderation_items`
`id, entity_type, entity_id, priority smallint (1 high–5 low), source enum('auto_flag','auto_block','hold','user_report','vendor_dispute','random_sample'), status enum('open','in_review','done'), assigned_to, opened_at, closed_at, outcome`
Trigger-populated: auto_flag/auto_block decisions, any `hold_reason <> 'none'`, report thresholds (§8.5), vendor disputes, 2 % sample of auto_pass.

### 6.17 `user_sanctions`
`id, profile_id, kind enum('warning','shadowban','suspension','ban','vendor_posting_ban'), reason, issued_by, issued_at, expires_at null, lifted_by, lifted_at`
Trigger keeps `profiles.is_shadowbanned` / `profiles.status` in sync. Posts RLS: `status='published' AND (author_id = auth.uid() OR NOT (select is_shadowbanned from profiles where id = author_id))` — reads one indexed boolean, no sanctions join.

### 6.18 `guides` — `id, slug unique, type enum('city_guide','area_guide','daytime','toolkit','blog','safety_page'), city_id null, title, excerpt, body_md, cover_image_url, author_profile_id, tags text[], seo_title, seo_description, status enum('draft','review','published','archived'), published_at, updated_by, view_count, search_tsv` + `guide_revisions (id, guide_id, body_md, saved_by, saved_at)`
Toolkit seed slugs: `visa-and-entry`, `visa-on-arrival`, `airport-arrival-lagos`, `airport-arrival-abuja`, `sim-cards-and-data`, `money-cash-cards-pos`, `getting-around-bolt-uber`, `first-48-hours-lagos`, `first-48-hours-abuja`, `what-to-pack`, `power-and-adapters`, `tipping-and-etiquette`.

### 6.19 `safety_info` — `id, city_id, section enum('emergency_numbers','hospitals','police_stations','embassies','travel_advice','area_notes','scam_awareness'), title, body_md, sort_order, last_verified_at, verified_by`
`private.issue_reports` — `id, reporter_id null, reporter_email null, city_id, area_id, location null, category enum('safety','scam','harassment','infrastructure','vendor_conduct','other'), description, status enum('new','triaged','escalated','closed'), handled_by, internal_note` — never public.

### 6.20 `point_events` — `id, profile_id null, vendor_id null, kind text ('checkin','checkin_at_venue','checkin_with_photo','pulse','official_update','first_at_vendor','streak'), points int, ref_entity_type, ref_entity_id, at` · daily caps enforced in service (max 60 points/user/day). Materialised `v_leaderboard_month`, `v_leaderboard_december` refreshed hourly by pg_cron.

### 6.21 `admin_tasks` — `id, title, description, assigned_to, created_by, priority enum('low','normal','high','urgent'), status enum('todo','doing','done'), due_at, related_entity_type, related_entity_id, completed_at`

### 6.22 `platform_settings` (single row) — `id=1, listing_is_free bool default true, monetisation_notice_md, checkin_expiry_hours int default 12, max_posts_per_user_per_hour int default 6, moderation_auto_block_threshold numeric default 0.85, moderation_auto_flag_threshold numeric default 0.5, media_hold_trust_below int default 50, media_hold_account_age_days int default 7, december_season_start date, december_season_end date, fx_gbp_per_ngn numeric, fx_usd_per_ngn numeric, maintenance_mode bool, blocklist_phrases text[]`

### 6.23 `activity_events` — `id bigserial, at, kind text, city_id, vendor_id, profile_id null, meta jsonb` · monthly partitions via `pg_partman` if available, else a single table with a `created_at` BRIN index and a pg_cron purge at 13 months (decide at L2 by checking extension availability; note in PROGRESS.md).

### 6.24 Stage P1 `private.agent_api_keys` — `id, name, key_hash, key_prefix, scopes text[] default '{read}', ip_allowlist cidr[] null, expires_at not null (default now() + 90 days), created_by, created_at, last_used_at, revoked_at`

### 6.25 Stage P2 `lists`, `list_items` · P3 `qa_questions`, `qa_answers`, `qa_votes` · P4 `itineraries`, `itinerary_items` · P6 `vendor_social_feeds`, `vendor_social_posts` — specified in §14 under their stages.

### 6.26 Views
- `public.v_live_now` (`security_invoker = true`): per vendor currently live — latest snapshot, confidence, last published photo, last official update. Backs Tonight view and `/api/live/[city]`.
- `public.v_public_profiles` (`security_invoker = true`).
- `private.v_platform_summary`, `private.v_vendor_health`, `private.v_moderation_stats` — admin and agent only.

---

## 7. Security requirements (non-negotiable)

7.1 **RLS on every table, default deny.** `private` schema not in PostgREST `exposed schemas`. Admin-role policies require `aal2`.
7.2 **Service role** only in `/lib/admin-db/*` and `/scripts/*`. ESLint `no-restricted-imports` blocks `admin-db` from `/components` and any `'use client'` file. A Vitest test greps for violations.
7.3 **Auth:** email verification before posting; custom SMTP (Resend) configured in Supabase so verification emails actually send; TOTP MFA mandatory for moderator/admin/super_admin; `@supabase/ssr` cookies `SameSite=Lax; Secure`.
7.4 **Validation:** zod on every Server Action and Route Handler; markdown via `isomorphic-dompurify` allowlist.
7.5 **Rate limits (Upstash, sliding window).** Per-user is primary. IP limits exist only to blunt bots and are generous because of carrier-grade NAT:
   - signup: 100/IP/hour (plus Supabase's own limits)
   - login: 20/user-email/15 min, 300/IP/15 min
   - post create: `max_posts_per_user_per_hour` (6)/user; 600/IP/hour
   - pulse: 20/user/hour; 2 per user per vendor per 30 min
   - report: 10/user/hour · issue_report: 5/user/hour, 50/IP/hour
   - media process: 12/user/hour
   - `/api/live` anon polling: 120/IP/minute
7.6 **Uploads:** client gets a signed upload URL (Server Action checks role, quota, mime, size ≤ 5 MB) into `media-incoming` (private). Client then calls `POST /api/media/process` **once per image**; the server downloads, re-encodes with `sharp` (strip metadata, max 2000 px, WebP q80), computes blurhash + dHash (`phash`), runs OpenAI image moderation, writes to `media` and `post_media`, deletes the incoming object. A post is only published after all its media rows have `processed_at`. Verification docs go to `verification-docs` (private); signed read URLs 10 min, admin only.
7.7 **Headers:** CSP (self, Supabase project host, `api.mapbox.com`, `*.tiles.mapbox.com`, `events.mapbox.com`, Vercel, Sentry, Google Fonts), HSTS, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (geolocation=self). Report-only in L1, enforced in L13.
7.8 **Secrets:** never logged; Sentry `beforeSend` scrubs tokens/emails/IPs.
7.9 **Audit:** per §6.14. Every privileged Server Action calls `write_audit`.
7.10 **Abuse controls:** trust score; shadowban; media holds for new/low-trust accounts (§8.5); phash duplicate detection; IP and device hashes are **informational only** in admin (CGNAT makes them unreliable) and never trigger automatic sanctions.
7.11 **Dependencies:** `npm audit` zero high/critical at each stage; lockfile committed; versions pinned.
7.12 **Data protection:** Nigeria Data Protection Act 2023 + UK GDPR-friendly defaults; privacy policy and terms template pages; explicit consent for location; account deletion anonymises profile and removes media within 24 h (pg_cron); verification docs purged 30 days after decision (§6.7).
7.13 **Backups:** PROD has PITR (SETUP.md); weekly `pg_dump` to a private bucket via `/api/cron/backup` (Vercel weekly cron, `CRON_SECRET`).
7.14 **DEV/PROD separation:** Claude Code only ever holds DEV credentials. L15 produces `LAUNCH.md` with exact manual steps for Fola to push migrations to PROD.

---

## 8. Core feature specifications

### 8.1 Tonight view (`/` and `/c/[city]`)
- City from `home_city_id` → geolocation (consent) → Lagos.
- Hero: city, date, "Live now" count, December season banner when active.
- **Live now rail** from `v_live_now` sorted `confidence desc, crowd_level desc`. Card: latest photo (or vendor cover), crowd badge, "Official update 12 min ago" or "3 check-ins · 23 min ago", price band, area.
- **Map toggle**: Mapbox loads only on toggle; before that a static city image. Heat layer weighted by `crowd_level_avg × (post_count + official_count×3)`; pins for live vendors; tap → bottom sheet.
- Filters: category, area, price band, features, open now.
- Empty state: forecast line if available, else "Be the first — tap to pulse" + "Vendors: post an official update".
- Data: SSR shell ISR 60 s; **authenticated** users subscribe via Realtime to `crowd_snapshots` for the city; **anonymous** users poll `GET /api/live/[city]` (ISR 30 s, 120/IP/min).
- Below: this week's events rail, trending guides, daytime picks, city leaderboard top 5.

### 8.2 Vendor live page (`/v/[slug]`)
1. Cover gallery: vendor photos + last 12 published community photos labelled "Community photo · Unverified".
2. Header: name, category, area, verified badge, price band, open now/opens at, crowd badge, forecast line.
3. Action row: **Pulse** (one tap) · Check in · Directions · Bolt deep link · Uber deep link (`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=…&dropoff[longitude]=…`; Bolt: `https://bolt.eu/en/rides/?dropoff_lat=…&dropoff_lng=…` with web fallback) · WhatsApp · Website/Book (external, `rel="nofollow noopener"`) · Share (WhatsApp `https://wa.me/?text=`, native share, copy link).
4. Live feed: published posts newest first; official posts pinned at top for 24 h with "Official · Verified vendor" (verified vendors) or "Official" (unverified vendors); community posts carry "Unverified — posted by a community member"; report; like.
5. Prices card · dress code · age policy. Empty state asks vendor to add prices.
6. About, features, hours, parking, late-night note. 7. Upcoming events. 8. Dispute button for vendor members ("This post is not from our venue") → moderation item source `vendor_dispute`.
Footer disclaimer site-wide: "Community posts are shared by individual users and are not verified by {BRAND_NAME} unless marked Official. See Community Guidelines."

### 8.3 Check-in and pulse (verified users)
- **Pulse**: one tap on crowd level → `kind='pulse'`, publishes immediately (no media, no text → no hold), +1 point, +1 extra if at-venue. 2 per vendor per 30 min.
- **Check-in** sheet: crowd + vibe required; optional wait, cover fee, 1–4 photos, note. Soft location permission; `is_at_venue` is a weight, never a gate. Submit → each image processed via `/api/media/process` → moderation (§8.5) → publish or hold. Points: 3 (+2 photo, +2 at-venue, +5 first check-in at that vendor today).
- Expiry per settings; posts remain on `/u/[username]` and vendor history.

### 8.4 Crowd aggregation and forecast
- `private.refresh_crowd_snapshots()` scheduled by pg_cron `*/5 * * * *`; single set-based INSERT … ON CONFLICT per bucket using §6.11 weights. Must run < 2 s on 10k vendors (test with seed ×100 in L7).
- `private.refresh_crowd_forecast()` nightly 04:00 WAT from last 8 weeks.
- Leaderboards refreshed hourly. Purges (expired incoming media 24 h, verification docs 30 d, deleted accounts 24 h, activity_events 13 months) daily 03:00 WAT.
- All functions `SECURITY DEFINER`, owned by postgres, in `private`.

### 8.5 Moderation pipeline (`/lib/moderation`)
1. Text + each image → OpenAI moderation; store scores.
2. Max score ≥ `auto_block_threshold` → `hidden`, `auto_block`, queue P1, author told "under review".
3. ≥ `auto_flag_threshold` → published, queue P2 (publish-then-review) **unless a hold applies**.
4. **Holds** (post stays `pending`, invisible, queue P2, author sees "Your photo is being reviewed — usually under an hour"): post has media AND (account age < `media_hold_account_age_days` OR trust < `media_hold_trust_below`); any video. Text-only and pulse never hold.
5. Heuristics add to an internal risk score shown to moderators; **only** phash-duplicate-to-different-vendor and > 3 posts in 10 min escalate priority; IP/device/distance signals are display-only.
6. Human outcomes adjust trust: +2 pass, −10 remove, −25 remove for 'fake'/'rival_sabotage'. Every outcome → audit.
7. Reports: 1 from trust ≥ 70 or 2 from anyone → P2; 3+ → auto-hide pending review. Vendor dispute → P2.
8. Community Guidelines page + removal email.

### 8.6 Events and December in Nigeria calendar
As v1.0 §8.6: vendor members and verified users submit (pending_review); admin approves/features; month grid + list; `/events/december` with countdown; iCal; event page with venue card, external ticket link, share; `is_december_season` by trigger.

### 8.7 Guides, daytime layer, toolkit, blog (CMS)
Routes `/guides/[city]`, `/guides/[city]/[slug]`, `/toolkit/[slug]`, `/blog/[slug]`. Markdown with custom tags `<VendorCard slug>`, `<Map vendors>`, `<PriceTable>`, `<Callout type>` parsed before dompurify. Revisions. JSON-LD (`Article`, `TouristAttraction`). OG via `@vercel/og`. "Last updated". `/guides/[city]` hub with Daytime / Nightlife / Food tabs. Itineraries move to P4.

### 8.8 Search — Postgres FTS + trigram on vendors, events, guides; typeahead Server Action 200 ms debounce.

### 8.9 Vendor self-serve onboarding (`/vendor/onboarding`)
Wizard with autosave: basics → contact → photos (one-per-call pipeline) → hours/price band/dress code/features → prices → review → `pending_review`. Free-listing notice from `monetisation_notice_md` at step 1 and in confirmation email. Dashboard: completeness %, status banner, **"Post an official update"** (two taps: crowd level + optional photo), verification request, QR poster (links to `/v/[slug]?pulse=1`), claim flow for `is_seed` vendors.

### 8.10 Public profile `/u/[username]` — badges, points, recent public posts. `/leaderboard/[city]` monthly + December.

---

## 9. Public JSON API (`/api/v1`)
Read: `cities`, `cities/[slug]/live`, `vendors`, `vendors/[slug]`, `vendors/[slug]/posts`, `events`, `guides`, `leaderboard/[city]`. Write (Supabase JWT): `posts`, `pulse`, `reports`. Thin wrappers over `/lib/services/*`. `{ data, error, meta }`. Documented in `/docs/api.md` (L14).

---

## 10. Safety section (`/safety/[city]`) — information only
Per-city verified emergency numbers (112 national emergency; LASEMA 767 Lagos; FRSC 122), hospitals with 24 h A&E, police stations, embassies (Lagos/Abuja), travel advice, area notes (factual, neutral), scam awareness. "Last verified: {date}" on every block. **Report an issue** → private form (anon allowed with email, honeypot, rate limited) → `private.issue_reports` → email admins for `safety`. Confirmation copy: "Thank you. Our team reviews every report. This is not an emergency service — if you are in danger call 112." No public incident map/feed; no "authorities will act" language anywhere (test greps for it).

---

## 11. Super-admin back office (`/admin`)
Access: admin roles + `aal2`. DataTable infrastructure: server-side pagination/sort/per-column filters, saved presets (localStorage), CSV export (admin+; **user table export super_admin only and audited**).
11.1 **Dashboard**: KPI tiles (signups, vendor signups, pending vendor reviews, posts/official updates/check-ins 24 h, live vendors, open moderation by priority, open reports, open issue reports); inline-SVG sparklines (no chart lib); **live activity stream** (Realtime on `activity_events` + audit, filter by kind/city/vendor/user, pause); "Needs attention" panel; admin tasks due.
11.2 **Vendors**: columns name, city, area, category, status, verified, claim, owner, completeness, official updates 7 d, posts 7 d, open reports, last activity, created; filters on all + "no prices"/"no photos"/"never posted"; actions view/edit/approve/reject(reason→email)/verify/suspend/view-as-vendor (read-only)/note/task; detail tabs Overview, Posts (all statuses), Members, Prices, Events, Verification (signed URLs; approve/reject), Reports, Audit, Notes; bulk approve/suspend/export.
11.3 **Moderation**: queue by priority/age; shortcuts A/R/S/N; item view with scores, heuristics, author card (trust, age, posts, sanctions, recent posts, informational IP/device cluster), vendor card, prior decisions; actions Approve / Approve+verify / Remove(reason) / Remove+warn / Remove+suspend / Remove+ban / Shadowban / Add blocklist phrase; holds tab; random-sample tab; stats.
11.4 **Users**: table (email admin+, IP info super_admin only, labelled "informational"), filters, actions warn/suspend/ban/shadowban/lift/reset trust/change role (super_admin, MFA re-prompt)/force logout/delete-anonymise; timeline detail.
11.5 **Posts**: all statuses with full filters; bulk hide/remove.
11.6 **Events**: approve/reject/feature/edit/cancel; duplicates finder.
11.7 **Content CMS**: guides/toolkit/blog/safety_info with markdown editor + live preview, cover upload, SEO fields, custom-tag buttons, draft preview token, publish/archive, revisions.
11.8 **Reports** · 11.9 **Issue reports** (private; triage; export admin+) · 11.10 **Cities & areas** (CRUD, map editor) · 11.11 **Tasks** (kanban) · 11.12 **Audit log** (read-only, diff viewer, export) · 11.13 **Points** (adjust, reset, badge grant, audited).
11.14 **Settings** (super_admin): platform_settings editor (thresholds, holds, season dates, FX, notice text, maintenance), feature flags (read-only from env), roles, blocklist, agent keys (P1), async data export (signed link by email).
11.15 **Daily digest** 08:00 WAT via Vercel daily cron.

---

## 12. Agent API (`/api/agent/v1`) — Stage P1
Auth header `X-Agent-Key`; keys sha256-hashed, shown once, **expire (default 90 days)**, optional **IP allowlist**, scopes `read`, `tasks:write`, `notes:write`, `pii:read` (super_admin grants; off by default). 120 req/min/key. All calls audited with `actor_role='agent'`.
Endpoints: `GET /summary`, `/activity`, `/live`, `/vendors`, `/vendors/:id`, `/moderation/queue`, `/moderation/stats`, `/reports`, `/issues` (**requires `pii:read`** — descriptions may contain third-party PII), `/users/:id` (email/IP only with `pii:read`), `/events`, `/content`, `/tasks`, `POST /tasks`, `POST /notes`, `/search`, `/schema`, `/openapi.json`. No moderation or sanction writes exposed. All reads via `/lib/services/*`.

---

## 13. Seed data (L2, DEV only)
6 cities + areas (Lagos 12, Abuja 8, Ibadan 6, PH 6, Aba 4, Owerri 4); categories; 10 `is_seed` sample vendors per city (fictional names, `draft`); toolkit guide drafts; safety_info skeleton with national numbers, `last_verified_at = null`; `platform_settings` (season 15 Nov–10 Jan); super admin via `scripts/create-super-admin.ts` from `SUPER_ADMIN_EMAIL`.

---

## 14. Build plan — stages (sequential; evidence required per stage)

Every stage ends: `npm run verify` → paste last 30 lines of real output into PROGRESS.md → self-review vs PRD → tick → `git commit -m "stage <id>: <name>"` → next stage. Never tick without evidence.

### Launch stages

**L1 — Scaffold, tooling, verify.** `create-next-app` (TS, App Router, Tailwind, ESLint); approved deps; shadcn (dark default, brand tokens); `/lib/config.ts`; `.env.example` complete; Prettier; Vitest + Playwright configs; `npm run verify` script; Sentry (server/client/edge); Analytics + Speed Insights; base layout; Supabase clients; admin-db + ESLint restriction + grep test; security headers (CSP report-only); PWA manifest; README.
Accept: verify passes; `/` renders branded placeholder; Sentry test event; headers test.

**L2 — Schema, private schema, RLS, pg_cron, seed (DEV).** Link DEV project; migrations implementing §6 in order (extensions → schemas → tables → triggers → `private` functions → pg_cron schedules → views → RLS `0029` → storage buckets/policies `0030` → audit immutability `0031`); confirm `private` not in exposed schemas (document the dashboard setting in LAUNCH.md and also set via SQL where possible); seed; super admin script; `supabase gen types`.
Accept: `db push` clean on DEV; `/tests/rls/*.test.ts` matrix proves anon cannot read `private.*`, hidden posts, or other users' holds; shadowbanned author sees own post, others don't; pg_cron jobs listed; seed loads.

**L3 — Auth, profiles, roles, MFA.** Signup/login/magic link/Google; verification gate; reset; `/me/settings` (username, avatar via pipeline, home city, diaspora toggle, location consent); guards with `aal2`; MFA enrolment `/admin/mfa`; session middleware; delete-anonymise.
Accept: unverified user blocked from posting; admin without MFA redirected; Playwright signup→verify→login green (Supabase DEV + Resend test domain or inbucket).

**L4 — Directory (read-only), share buttons.** `/c/[city]` filters; vendor cards; `/v/[slug]` (§8.2 minus feed/pulse); Mapbox lazy map; deep links; WhatsApp/native/copy share; prices; open-now logic; search; OG images; sitemap.
Accept: seed vendors render; map loads only on toggle; open-now correct in Africa/Lagos; Lighthouse mobile perf ≥ 85 on vendor page without map open.

**L5 — Vendor onboarding, dashboard, official updates.** §8.9 wizard; vendor_members; autosave; pipeline uploads; prices/hours editors; submit → pending + admin email; dashboard with completeness; **official update flow**; claim; verification request; QR poster. Minimal `/admin/vendors` approve/reject list (to be extended, not rewritten, in L12).
Accept: fresh account to submitted vendor < 10 min; official update appears on vendor page labelled Official.

**L6 — Check-ins, pulse, image pipeline, live feed, points.** §8.3; `/api/media/process` one-per-call; blurhash/phash; moderation stubbed to `auto_pass` (real in L8) but hold logic in place; feed with Realtime (auth) and polling (anon); expiry; like; labels; `/me/posts`; `/u/[username]`; report button; point_events + badges + `/leaderboard/[city]`.
Accept: two browsers — post in one, appears in other ≤ 2 s (auth) / ≤ 30 s (anon); pulse is one tap; 4-image check-in completes without any single request > 5 s; points awarded per rules; daily cap enforced.

**L7 — Crowd snapshots, Tonight view, heat map, forecast.** SQL functions + pg_cron; `v_live_now`; `/api/live/[city]`; Tonight view §8.1; crowd badge; forecast line.
Accept: unit test of weighting on seeded posts (official ×3, at-venue ×2, decay); snapshot function < 2 s on 10k synthetic vendors; heat map renders; empty state correct.

**L8 — Moderation pipeline, holds, reports, sanctions.** §8.5 in full; OpenAI text+image; holds; heuristics; trust; sanctions + shadowban trigger; report rules; dispute; Community Guidelines; emails; footer disclaimer.
Accept: test slur auto-hidden; borderline publishes + queued; new-account photo held; pulse never held; 3 reports hide; shadowban RLS proven; thresholds unit-tested.

**L9 — Events and December calendar.** §8.6.
Accept: season trigger correct; iCal valid; 200 events render smoothly.

**L10 — Guides, daytime layer, toolkit, blog (CMS).** §8.7 + full `/admin/content` editor now (content needed early); JSON-LD; OG; revisions.
Accept: paste markdown → preview → publish → in sitemap with valid JSON-LD (test).

**L11 — Safety info and private issue reports.** §10.
Accept: issue report invisible to every non-admin role (RLS test); grep test finds no "authorities will act"-type copy; numbers render per city.

**L12 — Super-admin back office.** §11 in full; extend L5 minimal admin.
Accept: every listed filter works; every destructive action needs a reason and audits; moderator blocked from settings (test); user CSV export only super_admin and audited; digest renders.

**L13 — Security hardening.** Walk §7 as a checklist; CSP enforced; rate limits tested; service-role isolation test; signed URL expiry test; audit immutability test (UPDATE/DELETE must fail even with service role); purge jobs tested; `npm audit` clean; privacy/terms pages; cookie consent (analytics only); Sentry scrub test.
Accept: `/tests/rls/matrix.test.ts` covers every role × every table; zero high/critical; no CSP violations on public pages.

**L14 — SEO, performance, PWA, analytics.** Metadata, canonical, sitemap, robots, JSON-LD audit, `next/image` + blurhash, ISR tuning, PWA offline fallback caching last 20 guides, `/docs/api.md`, custom analytics events.
Accept: Lighthouse mobile ≥ 90 perf / ≥ 95 a11y / 100 SEO on home, city, vendor (map closed), guide.

**L15 — Final QA, content loader, LAUNCH.md.** Playwright smoke (signup, onboard, approve, official update, pulse, check-in, moderate, share); `/content` format + `seed-content.ts`; **`LAUNCH.md`** with exact manual steps for Fola: create PROD env in Vercel, `supabase link --project-ref <PROD>` and `db push` from a clean checkout, confirm `private` schema not exposed, custom SMTP on PROD, PITR on, pg_cron jobs present, Resend domain verified, Mapbox URL restrictions + usage alert, rotate OpenAI/Groq keys, super admin + MFA, Sentry alerts, Vercel Pro, DNS cutover, smoke suite against PROD. Known-limitations list.
Accept: smoke green on Vercel preview against DEV; LAUNCH.md complete; all L stages ticked with evidence.

### Post-launch stages (continue automatically after L15)

**P1 — Agent API.** §12 + §6.24 + key UI in settings + `/docs/agent-api.md` with curl. Accept: valid key → summary; revoked/expired/wrong-IP → 401/403; scope enforcement; openapi.json validates.

**P2 — Lists and share pages.** `lists (id, owner_id, title, city_id, is_public, share_token nanoid12, view_count)`, `list_items (id, list_id, vendor_id null, event_id null, note, sort_order)`; "Add to my night" everywhere; `/l/[token]` public with map, cost estimate, WhatsApp share, OG. Accept: share link renders logged-out.

**P3 — Community Q&A.** `qa_questions`, `qa_answers`, `qa_votes` (as v1.0 §6.20); ask/answer/upvote/accept; vendor badge; pinned seeds; moderation; `/admin/qa`. Accept: moderation applies; pinned renders.

**P4 — Itineraries.** `itineraries`, `itinerary_items` (v1.0 §6.19); day tabs; running ₦ total with £/$ toggle from settings FX; CMS; JSON-LD. Accept: totals correct; FX toggle works.

**P5 — AI assistant.** Groq via AI SDK streaming; context assembly (city, FTS top 15, live summary); guardrails (no invented venues/prices; redirect safety questions to `/safety/[city]`); limits 20/user/hour, 200/IP/hour; logging. Accept: answers "where is busy in Lekki now" with vendor links; refuses road-safety question with safety link.

**P6 — Instagram feed (if `META_APP_ID` present and `FEATURE_INSTAGRAM_FEED=true`).** Vendor-owned Business/Creator OAuth; token AES-256-GCM with `TOKEN_ENCRYPTION_KEY`; sync last 12 media every 6 h (pg_cron + pg_net, or Vercel daily if pg_net unavailable); "From {vendor}'s Instagram" block; hide/disconnect. No tagged-media pulling. Skip cleanly if env absent.

**P7 — Video (if `FEATURE_VIDEO=true`).** ≤ 30 s, ≤ 50 MB, mp4/mov; always `hold_reason='video'` → human review before publish; no transcoding; moderators see inline player. Skip if flag false.

---

## 15. Out of scope for v1
Booking of any kind · payments/paid featuring · public incident feed · scraping · push notifications · native app · multi-language · star ratings/reviews · vendor analytics beyond counts.

## 16. Known limitations at launch
Crowd data depends on vendor and user activity (mitigated by §1.6); video off; Instagram off; FX rates manual; moderation AI-assisted with holds, not perfect; IP-based signals informational only.
