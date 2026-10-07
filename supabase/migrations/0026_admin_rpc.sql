-- 0026 · Service-role-only RPCs. `private` is not exposed through PostgREST, so server code
-- (lib/admin-db) reaches private data only through these. Never granted to anon/authenticated.

-- Explicit audit entry for privileged Server Actions (§7.9). Server passes the real actor + client IP.
create or replace function public.admin_write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb,
  p_after jsonb,
  p_reason text,
  p_actor_id uuid,
  p_actor_role text,
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

-- System health: scheduled pg_cron jobs.
create or replace function public.admin_list_cron_jobs()
returns table (jobname text, schedule text, command text, active boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select j.jobname::text, j.schedule::text, j.command::text, j.active
    from cron.job j
   order by j.jobname;
$$;

revoke all on function public.admin_write_audit(text, text, text, jsonb, jsonb, text, uuid, text, inet, text) from public, anon, authenticated;
revoke all on function public.admin_list_cron_jobs() from public, anon, authenticated;
grant execute on function public.admin_write_audit(text, text, text, jsonb, jsonb, text, uuid, text, inet, text) to service_role;
grant execute on function public.admin_list_cron_jobs() to service_role;
