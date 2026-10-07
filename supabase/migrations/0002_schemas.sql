-- 0002 · Schemas and shared helpers.
-- `private` holds admin-only data. It is NEVER added to PostgREST's exposed schemas, and API roles
-- get no privileges on it. Admin code reaches it only through service-role-only RPC functions.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

-- updated_at trigger function (shared by every table with updated_at)
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
