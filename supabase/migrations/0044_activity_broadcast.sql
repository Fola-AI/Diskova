-- 0044 · Admin live activity stream (§11.1) over Realtime *Broadcast from Database*.
-- postgres_changes can't stream a pg_partman-partitioned table (the WAL names the partition, not the
-- parent), so 0043's publication entry never delivered. Instead an AFTER INSERT trigger on the
-- parent (cloned to every partition) sends each event to the private topic `admin:activity`, and a
-- realtime.messages policy limits that topic to staff with an aal2 session.

do $$
begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_events') then
    alter publication supabase_realtime drop table public.activity_events;
  end if;
end;
$$;
alter publication supabase_realtime set (publish_via_partition_root = false);

create or replace function private.broadcast_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(
      jsonb_build_object('id', new.id, 'kind', new.kind, 'at', new.at, 'city_id', new.city_id,
                         'vendor_id', new.vendor_id, 'profile_id', new.profile_id, 'meta', new.meta),
      'activity', 'admin:activity', true);
  exception when others then
    null; -- the stream is best-effort; never fail the write that produced the event
  end;
  return null;
end;
$$;
revoke all on function private.broadcast_activity() from public, anon, authenticated;

drop trigger if exists activity_events_broadcast on public.activity_events;
create trigger activity_events_broadcast after insert on public.activity_events
  for each row execute function private.broadcast_activity();

drop policy if exists admin_activity_stream_read on realtime.messages;
create policy admin_activity_stream_read on realtime.messages for select to authenticated
  using (realtime.topic() = 'admin:activity' and (select public.has_staff_role('moderator')));
