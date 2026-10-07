-- 0046 · Weekly logical backup (§7.13). Vercel functions have no pg_dump binary, so
-- /api/cron/backup pages every table through these service-role-only RPCs and writes gzipped
-- NDJSON into the private `backups` bucket. PITR on PROD remains the primary recovery path.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 524288000, array['application/gzip'])
on conflict (id) do nothing;
-- No storage.objects policies for `backups`: only the service role can read or write it.

-- Tables to back up: every base/partitioned table in public + private, except high-volume
-- telemetry (activity_events, 13-month retention, not needed to restore the product).
create or replace function public.admin_backup_tables()
returns table (schema_name text, table_name text, est_rows bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select n.nspname::text, c.relname::text, greatest(c.reltuples, 0)::bigint
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'private')
     and c.relkind in ('r', 'p')
     and not c.relispartition
     and not (n.nspname = 'public' and c.relname = 'activity_events')
   order by 1, 2;
$$;

-- One page of rows as jsonb, ordered by primary key (stable paging).
create or replace function public.admin_backup_rows(p_schema text, p_table text, p_offset int default 0, p_limit int default 1000)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rel regclass;
  v_order text;
begin
  if not exists (select 1 from public.admin_backup_tables() t where t.schema_name = p_schema and t.table_name = p_table) then
    raise exception 'table not in backup set: %.%', p_schema, p_table using errcode = '42501';
  end if;
  v_rel := format('%I.%I', p_schema, p_table)::regclass;
  select string_agg(format('t.%I', a.attname), ', ' order by array_position(i.indkey::int2[], a.attnum))
    into v_order
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
   where i.indrelid = v_rel and i.indisprimary;
  return query execute format(
    'select to_jsonb(t) from %s t order by %s offset %s limit %s',
    v_rel, coalesce(v_order, 't.ctid'), greatest(p_offset, 0), least(greatest(p_limit, 1), 5000));
end;
$$;

revoke all on function public.admin_backup_tables() from public, anon, authenticated;
revoke all on function public.admin_backup_rows(text, text, int, int) from public, anon, authenticated;
grant execute on function public.admin_backup_tables() to service_role;
grant execute on function public.admin_backup_rows(text, text, int, int) to service_role;
