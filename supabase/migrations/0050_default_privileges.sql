-- 0050 · Security: the project's default privileges still gave anon/authenticated TRUNCATE, REFERENCES
-- and TRIGGER on every new table created by `postgres` ("auto-expose" off only removed read/write).
-- Remove those defaults for future tables (incl. pg_partman's monthly activity partitions) and
-- re-apply exact grants on tables created since 0029.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

revoke all on public.lists, public.list_items from anon, authenticated;
grant select on public.lists to authenticated;
grant insert (title, city_id, is_public) on public.lists to authenticated;
grant update (title, city_id, is_public) on public.lists to authenticated;
grant delete on public.lists to authenticated;
grant select on public.list_items to authenticated;
grant insert (list_id, vendor_id, event_id, note, sort_order) on public.list_items to authenticated;
grant update (note, sort_order) on public.list_items to authenticated;
grant delete on public.list_items to authenticated;
grant all on public.lists, public.list_items to service_role;

-- Existing activity_events partitions: reachable only through the parent.
do $$
declare r record;
begin
  for r in select inhrelid::regclass as part from pg_inherits where inhparent = 'public.activity_events'::regclass loop
    execute format('revoke all on %s from anon, authenticated', r.part);
  end loop;
end;
$$;

-- Any other public table: no TRUNCATE / TRIGGER / REFERENCES for API roles.
do $$
declare r record;
begin
  for r in select c.oid::regclass as rel from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p') loop
    execute format('revoke truncate, trigger, references on %s from anon, authenticated', r.rel);
  end loop;
end;
$$;
