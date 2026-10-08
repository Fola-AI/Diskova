# Promote the database to PROD (manual — Fola only)

Claude Code never holds PROD credentials (CLAUDE.md). Run these yourself from a **clean checkout of the
release commit** (the commit you're deploying to `main`). Everything here is idempotent.

```bash
git clone git@github.com:Fola-AI/Diskova.git diskova-release && cd diskova-release
git checkout <release-commit>
npm ci
```

## 1. Link and dry-run

```bash
npx supabase login                                  # uses your personal access token
npx supabase link --project-ref <PROD_REF>          # asks for the PROD database password
npx supabase db push --dry-run                      # lists 0001 … 0046 (or only the new ones)
```

Check the list matches `supabase/migrations/` and that nothing unexpected is pending.

## 2. Apply

```bash
npx supabase db push
npx supabase migration list                         # Local and Remote columns must match
```

## 3. Reference data (PROD-safe; never `seed.sql`)

```bash
psql "<PROD session-pooler URL>" -v ON_ERROR_STOP=1 -f supabase/seed/reference.sql
```

This loads categories, the six launch cities and their areas, platform-setting defaults (season dates
15 Nov → 10 Jan, the free-listing notice), toolkit drafts and the national emergency numbers. It contains no
venues. **Never** run `supabase/seed/seed.sql` or `dev-sample-content.sql` on PROD: they add fictional venues.

## 4. Verify

Run in the PROD SQL editor:

```sql
-- pg_cron jobs (7)
select jobname, schedule from cron.job order by 1;
-- expected: cron-history-cleanup, crowd-forecast, crowd-snapshots, daily-purges, leaderboards,
--           partman-maintenance, sanctions-expiry

-- Storage buckets (7)
select id, public from storage.buckets order by 1;
-- expected: backups(f) exports(f) guides(t) media(t) media-incoming(f) vendor-assets(t) verification-docs(f)

-- Live activity stream policy (migration 0044)
select polname from pg_policy where polrelid = 'realtime.messages'::regclass;   -- admin_activity_stream_read

-- RLS on every public table
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity;  -- expect 0 rows

-- Reference data
select (select count(*) from public.cities) cities, (select count(*) from public.areas) areas,
       (select count(*) from public.categories) categories, (select count(*) from public.vendors) vendors;
-- expect 6, 40, 19, 0 (until you load /content)
```

Then confirm the **exposed schemas** (Dashboard → Project Settings → Data API) are exactly
`public, graphql_public`, or:

```bash
curl -s -H "Authorization: Bearer <access-token>" https://api.supabase.com/v1/projects/<PROD_REF>/postgrest | jq .db_schema
```

`private` must not appear.

## 5. Later releases

Repeat steps 1, 2 and 4 for every release that adds a migration. Never edit an applied migration; add a new one.
