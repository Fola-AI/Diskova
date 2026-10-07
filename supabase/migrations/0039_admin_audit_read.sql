-- 0039 · Read the append-only audit log (service role only; admin audit viewer + tests).
create or replace function public.admin_list_audit(
  p_entity_type text default null,
  p_entity_id text default null,
  p_actor_id uuid default null,
  p_action_prefix text default null,
  p_limit int default 100,
  p_before_id bigint default null
)
returns table (
  id bigint, at timestamptz, actor_id uuid, actor_role text, action text, entity_type text,
  entity_id text, before jsonb, after jsonb, reason text, ip inet, user_agent text
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.at, a.actor_id, a.actor_role, a.action, a.entity_type, a.entity_id, a.before, a.after,
         a.reason, a.ip, a.user_agent
    from private.audit_log a
   where (p_entity_type is null or a.entity_type = p_entity_type)
     and (p_entity_id is null or a.entity_id = p_entity_id)
     and (p_actor_id is null or a.actor_id = p_actor_id)
     and (p_action_prefix is null or a.action like p_action_prefix || '%')
     and (p_before_id is null or a.id < p_before_id)
   order by a.id desc
   limit least(greatest(p_limit, 1), 500);
$$;
revoke all on function public.admin_list_audit(text, text, uuid, text, int, bigint) from public, anon, authenticated;
grant execute on function public.admin_list_audit(text, text, uuid, text, int, bigint) to service_role;
