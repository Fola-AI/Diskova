-- 0043 · Admin live activity stream over Realtime (§11.1). activity_events is partitioned (pg_partman),
-- so changes must be published under the parent table's name.
alter publication supabase_realtime set (publish_via_partition_root = true);
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_events') then
    alter publication supabase_realtime add table public.activity_events;
  end if;
end;
$$;
