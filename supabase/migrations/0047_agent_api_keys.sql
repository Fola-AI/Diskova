-- 0047 · Stage P1 · §6.24 private.agent_api_keys + service-role-only RPCs (§12 Agent API).
-- Keys are shown once; only a sha256 hash and a short prefix (to recognise them in the UI) are stored.
create table private.agent_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  key_prefix text not null check (char_length(key_prefix) between 6 and 20),
  scopes text[] not null default '{read}'
    check (scopes <@ array['read', 'tasks:write', 'notes:write', 'pii:read']::text[] and cardinality(scopes) > 0),
  ip_allowlist cidr[] null,
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index agent_api_keys_active_idx on private.agent_api_keys (key_hash) where revoked_at is null;
alter table private.agent_api_keys enable row level security; -- no policies: never reachable by API roles
revoke all on private.agent_api_keys from public, anon, authenticated;

create or replace function public.admin_create_agent_key(
  p_name text, p_key_hash text, p_key_prefix text, p_scopes text[], p_ip_allowlist cidr[], p_expires_at timestamptz, p_created_by uuid
) returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into private.agent_api_keys (name, key_hash, key_prefix, scopes, ip_allowlist, expires_at, created_by)
  values (p_name, p_key_hash, p_key_prefix, p_scopes, nullif(p_ip_allowlist, '{}'), p_expires_at, p_created_by)
  returning id;
$$;

create or replace function public.admin_list_agent_keys()
returns table (id uuid, name text, key_prefix text, scopes text[], ip_allowlist text[], expires_at timestamptz,
               created_by_username text, created_at timestamptz, last_used_at timestamptz, revoked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.name, k.key_prefix, k.scopes, k.ip_allowlist::text[], k.expires_at, p.username::text, k.created_at, k.last_used_at, k.revoked_at
    from private.agent_api_keys k
    left join public.profiles p on p.id = k.created_by
   order by k.revoked_at nulls first, k.created_at desc;
$$;

create or replace function public.admin_revoke_agent_key(p_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update private.agent_api_keys set revoked_at = now() where id = p_id and revoked_at is null returning true;
$$;

-- Verify a presented key: returns the key's state (or nothing for an unknown hash) and, when the key is
-- usable from this IP, stamps last_used_at. The caller turns the flags into 401 / 403.
create or replace function public.admin_verify_agent_key(p_key_hash text, p_ip inet)
returns table (id uuid, name text, scopes text[], created_by uuid, revoked boolean, expired boolean, ip_allowed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  k private.agent_api_keys%rowtype;
  v_ip_ok boolean;
begin
  select * into k from private.agent_api_keys where key_hash = p_key_hash;
  if not found then
    return;
  end if;
  v_ip_ok := k.ip_allowlist is null or (p_ip is not null and p_ip <<= any (k.ip_allowlist));
  if k.revoked_at is null and k.expires_at > now() and v_ip_ok then
    update private.agent_api_keys set last_used_at = now() where private.agent_api_keys.id = k.id;
  end if;
  return query select k.id, k.name, k.scopes, k.created_by, k.revoked_at is not null, k.expires_at <= now(), v_ip_ok;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_create_agent_key(text, text, text, text[], cidr[], timestamptz, uuid)',
    'public.admin_list_agent_keys()', 'public.admin_revoke_agent_key(uuid)', 'public.admin_verify_agent_key(text, inet)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
