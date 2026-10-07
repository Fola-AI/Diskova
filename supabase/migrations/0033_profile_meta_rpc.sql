-- 0033 · Record informational signup / last-seen network data (private.profile_meta, §6.8).
-- Service role only. Never used for automatic sanctions (§7.10).
create or replace function public.admin_record_profile_meta(
  p_profile_id uuid,
  p_ip inet default null,
  p_user_agent text default null,
  p_is_signup boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.profile_meta (profile_id, signup_ip, signup_ua, last_ip)
  values (
    p_profile_id,
    case when p_is_signup then p_ip end,
    case when p_is_signup then left(p_user_agent, 500) end,
    p_ip
  )
  on conflict (profile_id) do update set
    signup_ip = coalesce(private.profile_meta.signup_ip, excluded.signup_ip),
    signup_ua = coalesce(private.profile_meta.signup_ua, excluded.signup_ua),
    last_ip = coalesce(excluded.last_ip, private.profile_meta.last_ip);
end;
$$;
revoke all on function public.admin_record_profile_meta(uuid, inet, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_record_profile_meta(uuid, inet, text, boolean) to service_role;
