-- 0055 · Stage P5 · AI assistant logging (PRD P5 "logging"). Private, service-role only, kept 30 days.
create table private.assistant_logs (
  id bigint generated always as identity primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  city_id uuid references public.cities(id) on delete set null,
  question text not null check (char_length(question) <= 500),
  answer text check (char_length(answer) <= 4000),
  venues_offered int not null default 0,
  venues_linked text[] not null default '{}',
  outcome text not null check (outcome in ('answered', 'safety_redirect', 'blocked', 'error')),
  model text,
  latency_ms int,
  created_at timestamptz not null default now()
);
create index assistant_logs_created_idx on private.assistant_logs (created_at desc);
alter table private.assistant_logs enable row level security;
revoke all on private.assistant_logs from public, anon, authenticated;

create or replace function public.admin_log_assistant(
  p_profile_id uuid, p_city_id uuid, p_question text, p_answer text, p_venues_offered int, p_venues_linked text[],
  p_outcome text, p_model text, p_latency_ms int
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.assistant_logs (profile_id, city_id, question, answer, venues_offered, venues_linked, outcome, model, latency_ms)
  values (p_profile_id, p_city_id, left(p_question, 500), left(p_answer, 4000), p_venues_offered, coalesce(p_venues_linked, '{}'), p_outcome, p_model, p_latency_ms);
$$;
revoke all on function public.admin_log_assistant(uuid, uuid, text, text, int, text[], text, text, int) from public, anon, authenticated;
grant execute on function public.admin_log_assistant(uuid, uuid, text, text, int, text[], text, text, int) to service_role;

create or replace function private.purge_assistant_logs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_rows int;
begin
  delete from private.assistant_logs where created_at < now() - interval '30 days';
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

create or replace function private.run_daily_purges()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_step text;
  v_count int;
begin
  foreach v_step in array array['purge_incoming_media', 'purge_verification_docs', 'purge_deleted_accounts', 'purge_old_snapshots', 'purge_abandoned_posts', 'purge_assistant_logs'] loop
    begin
      execute format('select private.%I()', v_step) into v_count;
      v_result := v_result || jsonb_build_object(v_step, v_count);
    exception when others then
      v_result := v_result || jsonb_build_object(v_step, 'error: ' || sqlerrm);
    end;
  end loop;
  perform private.write_audit('system.daily_purge', 'system', null, null, v_result, null, null, 'system');
  return v_result;
end;
$$;
