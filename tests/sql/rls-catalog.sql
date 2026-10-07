-- Catalog invariants for the RLS matrix (Stage L13). Read-only. One JSON document on stdout.
select json_build_object(
  'public_tables', (
    select json_agg(json_build_object(
      'rel', c.relname, 'kind', c.relkind, 'rls', c.relrowsecurity,
      'policies', (select count(*) from pg_policy p where p.polrelid = c.oid),
      'anon_write', has_any_column_privilege('anon', c.oid, 'insert') or has_any_column_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete') or has_table_privilege('anon', c.oid, 'truncate'),
      'auth_insert', has_any_column_privilege('authenticated', c.oid, 'insert'),
      'auth_update', has_any_column_privilege('authenticated', c.oid, 'update'),
      'auth_delete', has_table_privilege('authenticated', c.oid, 'delete'),
      'auth_truncate', has_table_privilege('authenticated', c.oid, 'truncate'),
      'security_invoker', coalesce(c.reloptions::text[] @> array['security_invoker=true'], false)
    ) order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') and not c.relispartition
  ),
  'private_table_grants', (
    select coalesce(json_agg(c.relname || ':' || r.rolname), '[]'::json)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated')) r(rolname)
    where n.nspname = 'private' and c.relkind in ('r', 'p', 'v', 'm')
      and (has_table_privilege(r.rolname, c.oid, 'select') or has_table_privilege(r.rolname, c.oid, 'insert')
        or has_table_privilege(r.rolname, c.oid, 'update') or has_table_privilege(r.rolname, c.oid, 'delete'))
  ),
  'private_schema_usage', (
    select json_build_object('anon', has_schema_privilege('anon', 'private', 'usage'), 'authenticated', has_schema_privilege('authenticated', 'private', 'usage'))
  ),
  'public_admin_rpcs_callable_by_api', (
    select coalesce(json_agg(p.proname || ':' || r.rolname), '[]'::json)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('anon'), ('authenticated')) r(rolname)
    where n.nspname = 'public' and p.proname like 'admin\_%' and has_function_privilege(r.rolname, p.oid, 'execute')
  ),
  'partitions_reachable', (
    select coalesce(json_agg(i.inhrelid::regclass::text), '[]'::json)
    from pg_inherits i
    where i.inhparent = 'public.activity_events'::regclass
      and (has_table_privilege('anon', i.inhrelid, 'select') or has_table_privilege('authenticated', i.inhrelid, 'select'))
  )
);
