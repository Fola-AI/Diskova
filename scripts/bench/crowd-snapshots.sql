-- Stage L7 benchmark: private.refresh_crowd_snapshots() on 10,000 synthetic published vendors with
-- 30,000 posts in the last 90 minutes. Everything runs inside a transaction that is ROLLED BACK, so
-- DEV data is untouched. Run: npm run bench:snapshots
\set ON_ERROR_STOP on
set statement_timeout = 0;
begin;

insert into public.vendors (slug, name, category_id, city_id, location, status)
select 'bench-' || g, 'Bench venue ' || g,
       (select id from public.categories order by sort_order limit 1),
       (select id from public.cities where slug = 'lagos'),
       extensions.st_setsrid(extensions.st_makepoint(3.30 + random() * 0.30, 6.40 + random() * 0.20), 4326)::extensions.geography,
       'published'
  from generate_series(1, 10000) g;

insert into public.posts (author_id, vendor_id, kind, crowd_level, vibe, status, created_at)
select (select id from public.profiles order by created_at limit 1),
       v.id,
       (array['checkin', 'pulse', 'official'])[1 + floor(random() * 3)::int]::public.post_kind,
       1 + floor(random() * 5)::int,
       1 + floor(random() * 5)::int,
       'published',
       now() - make_interval(mins => floor(random() * 89)::int)
  from public.vendors v
 cross join generate_series(1, 3)
 where v.slug like 'bench-%';

-- Production tables are kept analysed by autovacuum. Without this, the planner would use pre-insert
-- statistics (60 vendors) inside this transaction and choose a plan that is ~50× slower.
analyze public.vendors;
analyze public.posts;
analyze public.profiles;

select count(*) as bench_vendors from public.vendors where slug like 'bench-%';
select count(*) as recent_published_posts from public.posts where status = 'published' and created_at > now() - interval '90 minutes';

\echo '--- refresh_crowd_snapshots(), 3 runs (first = inserts, then upserts) ---'
\timing on
select private.refresh_crowd_snapshots() as snapshot_rows;
select private.refresh_crowd_snapshots() as snapshot_rows;
select private.refresh_crowd_snapshots() as snapshot_rows;
\timing off

rollback;
