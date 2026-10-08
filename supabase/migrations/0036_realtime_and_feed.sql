-- 0036 · Live feed support (Stage L6)

-- Realtime (authenticated users only subscribe — §2): post and crowd changes.
-- REPLICA IDENTITY FULL so UPDATE events (pending → published) can be filtered by vendor_id / city.
alter table public.posts replica identity full;
alter table public.crowd_snapshots replica identity full;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts') then
    alter publication supabase_realtime add table public.posts;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crowd_snapshots') then
    alter publication supabase_realtime add table public.crowd_snapshots;
  end if;
end;
$$;

-- Check-ins are created first (pending) and finalised after their photos are processed. A check-in that
-- is never finalised (abandoned upload) is removed after 24 h so it can't linger invisibly.
create or replace function private.purge_abandoned_posts()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows int;
begin
  update public.posts
     set status = 'removed', deleted_at = now()
   where status = 'pending'
     and hold_reason = 'none'
     and moderation_decision is null
     and deleted_at is null
     and created_at < now() - interval '24 hours';
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

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
  foreach v_step in array array['purge_incoming_media', 'purge_verification_docs', 'purge_deleted_accounts', 'purge_old_snapshots', 'purge_abandoned_posts'] loop
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

-- Points today (Africa/Lagos day) for the daily cap (§6.20). Service role only.
create or replace function public.admin_points_today(p_profile_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(points), 0)::int
    from public.point_events
   where profile_id = p_profile_id
     and at >= (date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos');
$$;
revoke all on function public.admin_points_today(uuid) from public, anon, authenticated;
grant execute on function public.admin_points_today(uuid) to service_role;
