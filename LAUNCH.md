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
