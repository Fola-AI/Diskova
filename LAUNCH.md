# LAUNCH.md — production promotion (manual steps for Fola)

> Running checklist. Items are appended as each stage lands; Stage L15 turns this into the final,
> ordered runbook. Nothing here is executed by Claude Code — PROD credentials never leave Fola.

## Database (from Stage L2)

1. From a clean checkout of the release commit: `npx supabase link --project-ref <PROD_REF>` then
   `npx supabase db push` (applies `supabase/migrations/0001…` in order). Do **not** run
   `supabase/seed/seed.sql` on PROD — it contains fictional sample vendors. Real content is loaded in L15.
2. **Exposed schemas** (Dashboard → Project Settings → Data API → Exposed schemas): must be exactly
   `public, graphql_public`. If `private` is ever listed, remove it. Verify with
   `GET https://api.supabase.com/v1/projects/<PROD_REF>/postgrest` → `db_schema` has no `private`.
3. Confirm pg_cron jobs exist: `select jobname, schedule from cron.job order by 1;` → `crowd-snapshots`,
   `crowd-forecast`, `leaderboards`, `sanctions-expiry`, `daily-purges`, `partman-maintenance`,
   `cron-history-cleanup`.
4. Platform settings: set the December in Nigeria season dates (15 Nov → 10 Jan) and the free-listing
   notice in Admin → Settings (or `update public.platform_settings set december_season_start = …`).
5. Super admin: set `SUPER_ADMIN_EMAIL` and run `npm run create-super-admin` against PROD env, then sign
   in with a magic link and enrol TOTP MFA at `/admin/mfa`.
6. Storage purges (pending decision — see PROGRESS.md "Open questions"): if approved, store Vault
   secrets `app_project_url` and `app_service_role_key` on PROD so pg_cron can delete expired uploads,
   verification documents (30 days) and deleted-account media through the Storage API.

## Auth (from Stage L3)

7. **Custom SMTP (Resend)** on PROD *and* DEV — Dashboard → Authentication → SMTP Settings (SETUP.md §3a.9).
   Without it Supabase only emails project team members: on DEV today, signups from any other address are
   rejected with `email_address_invalid`.
8. **Email templates** (Authentication → Email Templates). Point links at the app so verification works across
   devices (open on phone after signing up on a laptop):
   - Confirm signup: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/me?welcome=1`
   - Magic link: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&next=/me`
   - Reset password: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset/update`
   - Change email: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&next=/me/settings`
   (The default `{{ .ConfirmationURL }}` templates also work, but only in the same browser that started the flow.)
9. **URL configuration**: Site URL `https://diskova.io`; redirect URLs `https://diskova.io/**` (PROD) — DEV keeps
   `http://localhost:3000/**` and `https://*.vercel.app/**`.
10. **Google OAuth**: publish the consent screen (DEV is in Testing mode — only listed test users can sign in).
11. Keep **Confirm email ON**, **TOTP MFA ON**, password policy = lower + upper + digit, min 8 (matches the app's validation).
12. **MFA recovery:** enrol two TOTP factors on the super-admin account (phone app + password manager). Supabase
    TOTP has no backup codes; a lost factor is removed in Dashboard → Authentication → Users → MFA.

## Content (from Stage L4)

13. **Never run `npm run db:samples` (or `supabase/seed/dev-sample-content.sql`) on PROD** — it publishes the
    fictional sample vendors. On PROD the sample vendors don't exist at all (seed is DEV-only).
14. **Mapbox**: the PROD token must be URL-restricted to `https://diskova.io/*` (and preview domains if wanted).
    The app uses GL JS (map toggle) *and* the Static Images API (map previews) — both count toward usage.

## Vendors (from Stage L5)

15. Set `EMAIL_ADMIN_TO` in Vercel (Production) — vendor submissions, claims and verification requests are
    emailed there (falls back to `SUPER_ADMIN_EMAIL`).
16. Vendor review lives at `/admin/vendors` (admin role + MFA). Verification documents are deleted 30 days after a
    decision by the daily purge — this needs the Vault secrets in step 6.

## Back office (from Stage L12)

17. Set `CRON_SECRET` in Vercel **Production** (any long random string). Vercel Cron sends it automatically to
    `/api/cron/digest` (daily 07:00 UTC = 08:00 WAT) and `/api/cron/backup` (Sundays 03:00 UTC), both declared in
    `vercel.json`. Without it both routes return 401.
18. After `supabase db push` on PROD, confirm the private `exports` storage bucket exists (migration 0042) and that
    migration 0044's `realtime.messages` policy is present (Dashboard → Realtime → Policies). The dashboard's live
    activity stream depends on it.
19. Staff roles: promote moderators/admins from `/admin/users/[id]` as super admin (needs a fresh MFA code). Each
    staff member must enrol TOTP at `/admin/mfa` on first visit.

## Security & privacy (from Stage L13)

20. **Enable PITR** on the PROD Supabase project (Database → Backups). The weekly logical backup in the private
    `backups` bucket (8 weeks kept) is a second line of defence, not a replacement.
21. After the first Sunday, check Storage → `backups/weekly/` has a file and the audit log has `system.backup`.
    The first run is limited by the function timeout (60 s); if the data grows past that, raise `maxDuration` on a Pro plan.
22. Set `NEXT_PUBLIC_CONTACT_EMAIL` (Production) to the inbox that answers privacy requests, and have
    `/privacy` and `/terms` reviewed by a lawyer before launch (they're accurate templates, not legal advice).
23. CSP is enforced. Violations are reported to Sentry (Security reports), so check Sentry after launch for any
    blocked third-party resource.
24. Answer open question 4 (Vault secrets for Storage purges) before launch. Without it, deleted users' photos
    and decided verification documents stay in Storage (rows are anonymised, files aren't deleted).

