-- 0015 · §6.14 private.audit_log (append-only; immutability enforced in 0031)
create table private.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  before jsonb,
  after jsonb,
  reason text,
  ip inet,
  user_agent text
);
create index audit_log_at_idx on private.audit_log (at desc);
create index audit_log_entity_idx on private.audit_log (entity_type, entity_id, at desc);
create index audit_log_actor_idx on private.audit_log (actor_id, at desc);
alter table private.audit_log enable row level security;

-- The ONLY way rows get into audit_log. Actor defaults to the JWT subject; role is looked up from
-- profiles, else the API role (service_role) or 'system' (pg_cron / migrations).
-- IP / UA default to PostgREST request headers; server code passes the real client IP explicitly.
create or replace function private.write_audit(
  p_action text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_before jsonb default null,
  p_after jsonb default null,
  p_reason text default null,
  p_actor_id uuid default null,
  p_actor_role text default null,
  p_ip inet default null,
  p_user_agent text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_role text := p_actor_role;
  v_headers jsonb;
  v_ip inet := p_ip;
  v_ua text := p_user_agent;
begin
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'write_audit: action is required';
  end if;

  if v_role is null then
    if v_actor is not null then
      select p.role::text into v_role from public.profiles p where p.id = v_actor;
    end if;
    v_role := coalesce(v_role, nullif(auth.role(), ''), 'system');
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    v_headers := null;
  end;

  if v_ip is null and v_headers is not null then
    begin
      v_ip := nullif(trim(split_part(coalesce(v_headers->>'x-forwarded-for', v_headers->>'x-real-ip', ''), ',', 1)), '')::inet;
    exception when others then
      v_ip := null;
    end;
  end if;
  if v_ua is null and v_headers is not null then
    v_ua := left(v_headers->>'user-agent', 500);
  end if;

  insert into private.audit_log (actor_id, actor_role, action, entity_type, entity_id, before, after, reason, ip, user_agent)
  values (v_actor, v_role, p_action, p_entity_type, p_entity_id, p_before, p_after, p_reason, v_ip, v_ua)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function private.write_audit(text, text, text, jsonb, jsonb, text, uuid, text, inet, text) from public;

-- Generic row-change audit trigger (CLAUDE.md: every write to a user-facing table is audited).
-- Updates that only touch counters / timestamps are skipped to keep the log meaningful.
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_ignore text[] := array[
    'updated_at', 'last_seen_at', 'view_count', 'last_activity_at', 'last_official_update_at',
    'like_count', 'post_count', 'report_count', 'points', 'search_tsv'
  ];
  v_row jsonb;
  v_entity_id text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old) - 'search_tsv'; end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new) - 'search_tsv'; end if;

  if tg_op = 'UPDATE' and (v_old - v_ignore) = (v_new - v_ignore) then
    return null;
  end if;

  v_row := coalesce(v_new, v_old);
  v_entity_id := coalesce(
    v_row->>'id',
    case when v_row ? 'vendor_id' and v_row ? 'profile_id'
      then (v_row->>'vendor_id') || ':' || (v_row->>'profile_id') end,
    v_row->>'profile_id'
  );

  perform private.write_audit(
    tg_table_name || '.' || lower(tg_op),
    tg_table_schema || '.' || tg_table_name,
    v_entity_id,
    v_old,
    v_new
  );
  return null;
end;
$$;
