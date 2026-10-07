-- 0025 · private functions run by pg_cron (§8.4). SECURITY DEFINER, owned by postgres, set-based.

-- §6.11 crowd snapshot for the current 5-minute bucket.
-- weight = age decay (<30 min 1.0, 30–60 0.6, 60–90 0.3) × kind (official ×3, at-venue ×2, else ×1).
-- Excludes non-published posts and shadowbanned authors. Confidence: Σw < 2 low, 2–5 medium, > 5 high.
create or replace function private.refresh_crowd_snapshots(p_now timestamptz default now())
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz := to_timestamp(floor(extract(epoch from p_now) / 300) * 300);
  v_rows int;
begin
  insert into public.crowd_snapshots as cs (
    vendor_id, bucket_start, crowd_level_avg, crowd_level_mode, vibe_avg,
    post_count, official_count, at_venue_count, confidence
  )
  select
    w.vendor_id,
    v_bucket,
    round(sum(w.crowd_level * w.weight) / sum(w.weight), 2),
    mode() within group (order by w.crowd_level),
    round(
      sum(w.vibe * w.weight) filter (where w.vibe is not null)
        / nullif(sum(w.weight) filter (where w.vibe is not null), 0),
      2
    ),
    count(*) filter (where w.kind <> 'official'),
    count(*) filter (where w.kind = 'official'),
    count(*) filter (where w.is_at_venue),
    case
      when sum(w.weight) < 2 then 'low'
      when sum(w.weight) <= 5 then 'medium'
      else 'high'
    end::public.crowd_confidence
  from (
    select
      p.vendor_id, p.kind, p.crowd_level, p.vibe, p.is_at_venue,
      (case
         when p.created_at > p_now - interval '30 minutes' then 1.0
         when p.created_at > p_now - interval '60 minutes' then 0.6
         else 0.3
       end)
      * (case
           when p.kind = 'official' then 3
           when p.is_at_venue then 2
           else 1
         end) as weight
    from public.posts p
    join public.profiles a on a.id = p.author_id
    join public.vendors v on v.id = p.vendor_id
    where p.status = 'published'
      and p.deleted_at is null
      and p.crowd_level is not null
      and p.created_at > p_now - interval '90 minutes'
      and p.created_at <= p_now
      and not a.is_shadowbanned
      and v.status = 'published'
      and v.deleted_at is null
  ) w
  group by w.vendor_id
  on conflict (vendor_id, bucket_start) do update set
    crowd_level_avg = excluded.crowd_level_avg,
    crowd_level_mode = excluded.crowd_level_mode,
    vibe_avg = excluded.vibe_avg,
    post_count = excluded.post_count,
    official_count = excluded.official_count,
    at_venue_count = excluded.at_venue_count,
    confidence = excluded.confidence;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- §6.12 forecast from the last 8 weeks of snapshots, per vendor × weekday × hour (Africa/Lagos).
-- Averages per day first so one busy night doesn't dominate; sample_size = distinct days.
create or replace function private.refresh_crowd_forecast(p_now timestamptz default now())
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
begin
  drop table if exists _forecast;
  create temporary table _forecast on commit drop as
  select d.vendor_id, d.weekday, d.hour,
         round(avg(d.day_avg), 2) as crowd_level_expected,
         count(*)::int as sample_size
    from (
      select s.vendor_id,
             extract(dow from s.bucket_start at time zone 'Africa/Lagos')::smallint as weekday,
             extract(hour from s.bucket_start at time zone 'Africa/Lagos')::smallint as hour,
             (s.bucket_start at time zone 'Africa/Lagos')::date as day,
             avg(s.crowd_level_avg) as day_avg
        from public.crowd_snapshots s
       where s.bucket_start >= p_now - interval '8 weeks'
       group by 1, 2, 3, 4
    ) d
   group by d.vendor_id, d.weekday, d.hour;

  delete from public.crowd_forecast f
   where not exists (
     select 1 from _forecast n
      where n.vendor_id = f.vendor_id and n.weekday = f.weekday and n.hour = f.hour
   );

  insert into public.crowd_forecast (vendor_id, weekday, hour, crowd_level_expected, sample_size)
  select vendor_id, weekday, hour, crowd_level_expected, sample_size from _forecast
  on conflict (vendor_id, weekday, hour) do update set
    crowd_level_expected = excluded.crowd_level_expected,
    sample_size = excluded.sample_size;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- §6.20 leaderboards (materialized views created in 0028).
create or replace function private.refresh_leaderboards()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  refresh materialized view concurrently public.v_leaderboard_month;
  refresh materialized view concurrently public.v_leaderboard_december;
end;
$$;

-- Re-derive profile status for sanctions that have just expired.
create or replace function private.refresh_expired_sanctions()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_n int := 0;
begin
  for r in
    select distinct s.profile_id
      from public.user_sanctions s
      join public.profiles p on p.id = s.profile_id
     where s.lifted_at is null
       and s.expires_at is not null
       and s.expires_at <= now()
       and (p.status <> 'active' or p.is_shadowbanned)
  loop
    perform private.recompute_profile_sanctions(r.profile_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Delete storage objects through the Storage API (direct SQL deletes on storage.objects are
-- blocked by Supabase's protect_delete trigger and would orphan the files anyway).
-- Needs Vault secrets `app_project_url` and `app_service_role_key`. If absent, nothing is deleted,
-- a WARNING is raised, and NULL is returned so callers don't mark anything as purged.
create or replace function private.storage_delete_objects(p_bucket text, p_paths text[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
  v_chunk text[];
  v_requests int := 0;
  i int;
begin
  if p_paths is null or cardinality(p_paths) = 0 then
    return 0;
  end if;

  select ds.decrypted_secret into v_url from vault.decrypted_secrets ds where ds.name = 'app_project_url';
  select ds.decrypted_secret into v_key from vault.decrypted_secrets ds where ds.name = 'app_service_role_key';
  if v_url is null or v_key is null then
    raise warning 'storage_delete_objects: Vault secrets missing; % object(s) in bucket % NOT deleted',
      cardinality(p_paths), p_bucket;
    return null;
  end if;

  i := 1;
  while i <= cardinality(p_paths) loop
    v_chunk := p_paths[i : i + 499];
    perform net.http_delete(
      url := rtrim(v_url, '/') || '/storage/v1/object/' || p_bucket,
      headers := jsonb_build_object(
        'apikey', v_key,
        'Authorization', 'Bearer ' || v_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('prefixes', to_jsonb(v_chunk)),
      timeout_milliseconds := 20000
    );
    v_requests := v_requests + 1;
    i := i + 500;
  end loop;
  return v_requests;
end;
$$;

-- §7.6: incoming uploads that were never processed are removed after 24 h.
create or replace function private.purge_incoming_media()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paths text[];
begin
  select array_agg(o.name) into v_paths
    from storage.objects o
   where o.bucket_id = 'media-incoming'
     and o.created_at < now() - interval '24 hours';
  if v_paths is null then
    return 0;
  end if;
  if private.storage_delete_objects('media-incoming', v_paths) is null then
    return 0;
  end if;
  return cardinality(v_paths);
end;
$$;

-- §6.7: verification documents deleted 30 days after the decision (approved or rejected).
create or replace function private.purge_verification_docs()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_paths text[];
  v_n int := 0;
begin
  for r in
    select id, business_doc_path, id_doc_path
      from private.vendor_verification_requests
     where docs_purged_at is null
       and reviewed_at is not null
       and reviewed_at < now() - interval '30 days'
  loop
    v_paths := array_remove(array[r.business_doc_path, r.id_doc_path], null);
    if cardinality(v_paths) = 0 or private.storage_delete_objects('verification-docs', v_paths) is not null then
      update private.vendor_verification_requests
         set business_doc_path = null, id_doc_path = null, docs_purged_at = now()
       where id = r.id;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- §7.12: deleted accounts are anonymised and their media removed within 24 h.
-- (The request itself soft-deletes the auth user and signs them out — Stage L3.)
create or replace function private.purge_deleted_accounts()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_paths text[];
  v_n int := 0;
begin
  for r in
    select pr.id
      from public.profiles pr
     where pr.deleted_at is not null
       and pr.deleted_at < now() - interval '24 hours'
       and (
         pr.username::text not like 'deleted\_%'
         or exists (select 1 from public.posts p join public.post_media pm on pm.post_id = p.id where p.author_id = pr.id)
       )
  loop
    select array_agg(x.path) into v_paths from (
      select pm.storage_path as path
        from public.post_media pm join public.posts p on p.id = pm.post_id
       where p.author_id = r.id
      union
      select o.name from storage.objects o
       where o.bucket_id = 'media' and o.name like 'avatars/' || r.id::text || '/%'
    ) x;

    if v_paths is null or private.storage_delete_objects('media', v_paths) is not null then
      delete from public.post_media pm using public.posts p where pm.post_id = p.id and p.author_id = r.id;
    end if;

    update public.posts
       set deleted_at = coalesce(deleted_at, now()), body = null, location = null
     where author_id = r.id;

    update public.profiles
       set username = 'deleted_' || left(replace(r.id::text, '-', ''), 12),
           display_name = null, avatar_url = null, bio = null, home_city_id = null,
           is_diaspora = null, location_consent = false, badges = '{}'
     where id = r.id and username::text not like 'deleted\_%';

    update private.profile_meta
       set signup_ip = null, last_ip = null, signup_ua = null, device_hash = null
     where profile_id = r.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- Snapshots are only needed for the 8-week forecast window (+ margin).
create or replace function private.purge_old_snapshots()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
begin
  delete from public.crowd_snapshots where bucket_start < now() - interval '70 days';
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

-- Daily 03:00 WAT. Each step is isolated so one failure doesn't block the others; the run is audited.
create or replace function private.run_daily_purges()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_step text;
  v_count int;
begin
  foreach v_step in array array['purge_incoming_media', 'purge_verification_docs', 'purge_deleted_accounts', 'purge_old_snapshots'] loop
    begin
      execute format('select private.%I()', v_step) into v_count;
      v_result := v_result || jsonb_build_object(v_step, v_count);
    exception when others then
      v_result := v_result || jsonb_build_object(v_step, 'error: ' || sqlerrm);
    end;
  end loop;
  perform private.write_audit('system.daily_purge', 'system', null, null, v_result, null, null, 'system');
  return v_result;
end;
$$;
