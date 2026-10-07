-- 0038 · Service-role triggers for the crowd jobs (admin "refresh now", integration tests, benchmarks).
create or replace function public.admin_refresh_crowd_snapshots(p_now timestamptz default now())
returns int
language sql
security definer
set search_path = ''
as $$ select private.refresh_crowd_snapshots(p_now) $$;

create or replace function public.admin_refresh_crowd_forecast(p_now timestamptz default now())
returns int
language sql
security definer
set search_path = ''
as $$ select private.refresh_crowd_forecast(p_now) $$;

create or replace function public.admin_refresh_leaderboards()
returns void
language sql
security definer
set search_path = ''
as $$ select private.refresh_leaderboards() $$;

revoke all on function public.admin_refresh_crowd_snapshots(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_refresh_crowd_forecast(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_refresh_leaderboards() from public, anon, authenticated;
grant execute on function public.admin_refresh_crowd_snapshots(timestamptz) to service_role;
grant execute on function public.admin_refresh_crowd_forecast(timestamptz) to service_role;
grant execute on function public.admin_refresh_leaderboards() to service_role;
