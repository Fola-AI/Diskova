-- 0028 · Views (§6.26), leaderboards (§6.20), vendor completeness

-- Public profile fields only (+ id, needed to attribute posts). security_invoker → RLS + column
-- privileges of the caller apply.
create view public.v_public_profiles
with (security_invoker = true) as
select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.badges, p.points, p.post_count
  from public.profiles p
 where p.deleted_at is null;

-- Vendors that are live right now: latest snapshot in the last 15 minutes, plus last community
-- photo and last official update. Backs the Tonight view and /api/live/[city].
create view public.v_live_now
with (security_invoker = true) as
select
  v.id as vendor_id,
  v.slug,
  v.name,
  v.tagline,
  v.city_id,
  v.area_id,
  v.category_id,
  v.price_band,
  v.verified,
  v.cover_image_url,
  extensions.st_y(v.location::extensions.geometry) as lat,
  extensions.st_x(v.location::extensions.geometry) as lng,
  s.bucket_start,
  s.crowd_level_avg,
  s.crowd_level_mode,
  s.vibe_avg,
  s.post_count,
  s.official_count,
  s.at_venue_count,
  s.confidence,
  lp.storage_path as last_photo_path,
  lp.blurhash as last_photo_blurhash,
  lp.created_at as last_photo_at,
  v.last_official_update_at,
  v.last_activity_at
from public.vendors v
join lateral (
  select cs.*
    from public.crowd_snapshots cs
   where cs.vendor_id = v.id
   order by cs.bucket_start desc
   limit 1
) s on true
left join lateral (
  select pm.storage_path, pm.blurhash, p.created_at
    from public.posts p
    join public.post_media pm on pm.post_id = p.id
   where p.vendor_id = v.id
     and p.status = 'published'
     and p.deleted_at is null
     and pm.kind = 'image'
     and pm.processed_at is not null
   order by p.created_at desc, pm.sort_order
   limit 1
) lp on true
where v.status = 'published'
  and v.deleted_at is null
  and s.bucket_start >= now() - interval '15 minutes';

-- Profile completeness % for a vendor (dashboard §8.9, admin §11.2). Exposed as a PostgREST
-- computed column: select=*,vendor_completeness
create or replace function public.vendor_completeness(v public.vendors)
returns int
language sql
stable
set search_path = ''
as $$
  select round(100.0 * (
      (v.tagline is not null and v.tagline <> '')::int
    + (v.description_md is not null and char_length(v.description_md) >= 80)::int
    + (v.cover_image_url is not null)::int
    + (v.logo_url is not null)::int
    + (jsonb_typeof(v.gallery) = 'array' and jsonb_array_length(v.gallery) >= 3)::int
    + (coalesce(v.phone, v.whatsapp) is not null)::int
    + (v.address_line is not null and v.area_id is not null)::int
    + (v.opening_hours <> '{}'::jsonb)::int
    + (v.price_band is not null)::int
    + (cardinality(v.features) > 0)::int
    + exists (select 1 from public.vendor_prices pr where pr.vendor_id = v.id and pr.is_active)::int
  ) / 11.0)::int;
$$;
revoke all on function public.vendor_completeness(public.vendors) from public;
grant execute on function public.vendor_completeness(public.vendors) to anon, authenticated, service_role;

-- Leaderboards (refreshed hourly by pg_cron). scope_key = city uuid, or 'all' for national.
-- Excludes deleted, banned and shadowbanned profiles.
create materialized view public.v_leaderboard_month as
with pts as (
  select pe.profile_id, v.city_id, pe.points
    from public.point_events pe
    left join public.vendors v on v.id = pe.vendor_id
    join public.profiles p on p.id = pe.profile_id
   where pe.profile_id is not null
     and pe.at >= (date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')
     and p.deleted_at is null and not p.is_shadowbanned and p.status <> 'banned'
), scoped as (
  select city_id::text as scope_key, city_id, profile_id, sum(points)::int as points
    from pts where city_id is not null group by city_id, profile_id
  union all
  select 'all', null::uuid, profile_id, sum(points)::int from pts group by profile_id
)
select s.scope_key, s.city_id, s.profile_id, p.username::text as username, p.display_name, p.avatar_url,
       p.badges, s.points,
       rank() over (partition by s.scope_key order by s.points desc)::int as rank
  from scoped s join public.profiles p on p.id = s.profile_id
 where s.points > 0;
create unique index v_leaderboard_month_uniq on public.v_leaderboard_month (scope_key, profile_id);
create index v_leaderboard_month_rank on public.v_leaderboard_month (scope_key, rank);

create materialized view public.v_leaderboard_december as
with season as (
  select (s.december_season_start::timestamp at time zone 'Africa/Lagos') as starts,
         ((s.december_season_end + 1)::timestamp at time zone 'Africa/Lagos') as ends
    from public.platform_settings s
   where s.id = 1 and s.december_season_start is not null and s.december_season_end is not null
), pts as (
  select pe.profile_id, v.city_id, pe.points
    from public.point_events pe
    cross join season
    left join public.vendors v on v.id = pe.vendor_id
    join public.profiles p on p.id = pe.profile_id
   where pe.profile_id is not null
     and pe.at >= season.starts and pe.at < season.ends
     and p.deleted_at is null and not p.is_shadowbanned and p.status <> 'banned'
), scoped as (
  select city_id::text as scope_key, city_id, profile_id, sum(points)::int as points
    from pts where city_id is not null group by city_id, profile_id
  union all
  select 'all', null::uuid, profile_id, sum(points)::int from pts group by profile_id
)
select s.scope_key, s.city_id, s.profile_id, p.username::text as username, p.display_name, p.avatar_url,
       p.badges, s.points,
       rank() over (partition by s.scope_key order by s.points desc)::int as rank
  from scoped s join public.profiles p on p.id = s.profile_id
 where s.points > 0;
create unique index v_leaderboard_december_uniq on public.v_leaderboard_december (scope_key, profile_id);
create index v_leaderboard_december_rank on public.v_leaderboard_december (scope_key, rank);

-- ---------- private admin / agent views (never exposed; read through service-role RPCs) --------
create view private.v_platform_summary as
select
  (select count(*) from public.profiles where deleted_at is null) as users_total,
  (select count(*) from public.profiles where created_at > now() - interval '24 hours') as signups_24h,
  (select count(*) from public.vendors where deleted_at is null and not is_seed) as vendors_total,
  (select count(*) from public.vendors where created_at > now() - interval '24 hours' and not is_seed) as vendor_signups_24h,
  (select count(*) from public.vendors where status = 'pending_review' and deleted_at is null) as vendors_pending_review,
  (select count(*) from public.vendors where verified and deleted_at is null) as vendors_verified,
  (select count(*) from public.posts where created_at > now() - interval '24 hours') as posts_24h,
  (select count(*) from public.posts where kind = 'official' and created_at > now() - interval '24 hours') as official_updates_24h,
  (select count(*) from public.posts where kind = 'checkin' and created_at > now() - interval '24 hours') as checkins_24h,
  (select count(*) from public.posts where kind = 'pulse' and created_at > now() - interval '24 hours') as pulses_24h,
  (select count(distinct vendor_id) from public.crowd_snapshots where bucket_start >= now() - interval '15 minutes') as live_vendors,
  (select count(*) from public.moderation_items where status <> 'done' and priority = 1) as moderation_open_p1,
  (select count(*) from public.moderation_items where status <> 'done' and priority = 2) as moderation_open_p2,
  (select count(*) from public.moderation_items where status <> 'done' and priority >= 3) as moderation_open_p3_plus,
  (select count(*) from public.reports where status in ('open', 'reviewing')) as open_reports,
  (select count(*) from private.issue_reports where status in ('new', 'triaged', 'escalated')) as open_issue_reports,
  now() as generated_at;

create view private.v_vendor_health as
select
  v.id, v.slug, v.name, v.city_id, v.area_id, v.category_id, v.status, v.verified, v.claim_status,
  v.owner_profile_id, v.is_seed,
  public.vendor_completeness(v) as completeness,
  (select count(*) from public.posts p where p.vendor_id = v.id and p.kind = 'official'
      and p.created_at > now() - interval '7 days') as official_updates_7d,
  (select count(*) from public.posts p where p.vendor_id = v.id
      and p.created_at > now() - interval '7 days') as posts_7d,
  (select count(*) from public.reports r where r.entity_type = 'vendor' and r.entity_id = v.id
      and r.status in ('open', 'reviewing')) as open_reports,
  exists (select 1 from public.vendor_prices pr where pr.vendor_id = v.id and pr.is_active) as has_prices,
  (v.cover_image_url is not null or jsonb_array_length(v.gallery) > 0) as has_photos,
  not exists (select 1 from public.posts p where p.vendor_id = v.id) as never_posted,
  v.last_activity_at, v.last_official_update_at, v.created_at
from public.vendors v
where v.deleted_at is null;

create view private.v_moderation_stats as
select
  (select count(*) from public.moderation_items where status <> 'done') as open_total,
  (select jsonb_object_agg(priority, n) from (
      select priority, count(*) as n from public.moderation_items where status <> 'done' group by priority) x
  ) as open_by_priority,
  (select jsonb_object_agg(source, n) from (
      select source, count(*) as n from public.moderation_items where status <> 'done' group by source) x
  ) as open_by_source,
  (select count(*) from public.posts where moderation_decision in ('auto_flag', 'auto_block')
      and created_at > now() - interval '7 days') as auto_flagged_7d,
  (select count(*) from public.posts where moderation_decision in ('human_pass', 'human_remove')
      and moderated_at > now() - interval '7 days') as human_actioned_7d,
  (select percentile_cont(0.5) within group (order by extract(epoch from closed_at - opened_at))
     from public.moderation_items where status = 'done' and closed_at > now() - interval '7 days'
  ) as median_seconds_to_close_7d,
  now() as generated_at;
