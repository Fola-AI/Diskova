-- 0032 · admin_write_audit: optional arguments default to NULL (system actions have no actor;
-- not every action has a before/after/reason).
create or replace function public.admin_write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb default null,
  p_after jsonb default null,
  p_reason text default null,
  p_actor_id uuid default null,
  p_actor_role text default null,
  p_ip inet default null,
  p_user_agent text default null
)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select private.write_audit(p_action, p_entity_type, p_entity_id, p_before, p_after, p_reason,
                             p_actor_id, p_actor_role, p_ip, p_user_agent);
$$;
revoke all on function public.admin_write_audit(text, text, text, jsonb, jsonb, text, uuid, text, inet, text) from public, anon, authenticated;
grant execute on function public.admin_write_audit(text, text, text, jsonb, jsonb, text, uuid, text, inet, text) to service_role;
