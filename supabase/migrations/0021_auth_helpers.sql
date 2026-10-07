-- 0021 · Role / membership helpers used by RLS policies (§5).
-- SECURITY DEFINER so policies can read profiles/vendor_members without recursive RLS, and so the
-- shadowban flag stays unreadable to API roles. Each returns facts about the *caller* only.

-- Caller's role, or null if signed out / deleted / suspended / banned.
create or replace function public.current_profile_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
    from public.profiles p
   where p.id = (select auth.uid())
     and p.deleted_at is null
     and p.status not in ('suspended', 'banned');
$$;

-- Staff check: role rank ≥ min_role (enum order user < vendor_member < moderator < admin < super_admin)
-- AND the session is MFA-verified (aal2). Never true for non-staff roles.
create or replace function public.has_staff_role(min_role public.user_role default 'moderator')
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select min_role >= 'moderator'::public.user_role
     and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
     and coalesce(public.current_profile_role() >= min_role, false);
$$;

-- Verified, active (or warned) account: may post, pulse, report, submit.
create or replace function public.is_verified_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = (select auth.uid())
       and p.email_verified_at is not null
       and p.deleted_at is null
       and p.status in ('active', 'warned')
  );
$$;

-- Accepted member of a vendor with at least p_min_role (enum order owner < manager < staff,
-- so "at least manager" means role <= 'manager').
create or replace function public.is_vendor_member(
  p_vendor_id uuid,
  p_min_role public.vendor_member_role default 'staff'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.vendor_members m
      join public.profiles p on p.id = m.profile_id
     where m.vendor_id = p_vendor_id
       and m.profile_id = (select auth.uid())
       and m.accepted_at is not null
       and m.role <= p_min_role
       and p.deleted_at is null
       and p.status in ('active', 'warned')
  );
$$;

-- Official / update posts: vendor member without an active vendor_posting_ban.
create or replace function public.can_post_official(p_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_vendor_member(p_vendor_id)
     and not exists (
       select 1 from public.user_sanctions s
        where s.profile_id = (select auth.uid())
          and s.kind = 'vendor_posting_ban'
          and s.lifted_at is null
          and (s.expires_at is null or s.expires_at > now())
     );
$$;

-- §6.17: a post is visible to others only if its author is not shadowbanned; authors always see
-- their own. Reads one boolean by primary key.
create or replace function public.author_is_visible(p_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_author_id = (select auth.uid())
      or not coalesce((select p.is_shadowbanned from public.profiles p where p.id = p_author_id), false);
$$;

-- The caller's own profile, including private fields — but never the shadowban flag or trust score.
create or replace function public.get_my_profile()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  home_city_id uuid,
  is_diaspora boolean,
  role public.user_role,
  email_verified_at timestamptz,
  status public.profile_status,
  status_reason text,
  status_until timestamptz,
  points int,
  post_count int,
  badges text[],
  location_consent boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, p.bio, p.home_city_id, p.is_diaspora,
         p.role, p.email_verified_at, p.status, p.status_reason, p.status_until, p.points, p.post_count,
         p.badges, p.location_consent, p.created_at
    from public.profiles p
   where p.id = (select auth.uid()) and p.deleted_at is null;
$$;

-- True when the current request comes through the Data API as anon/authenticated (not service role,
-- not pg_cron / migrations). Used by guard triggers.
create or replace function private.is_api_caller()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.role(), '') in ('anon', 'authenticated');
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.has_staff_role(public.user_role) from public;
revoke all on function public.is_verified_user() from public;
revoke all on function public.is_vendor_member(uuid, public.vendor_member_role) from public;
revoke all on function public.can_post_official(uuid) from public;
revoke all on function public.author_is_visible(uuid) from public;
revoke all on function public.get_my_profile() from public;
grant execute on function public.current_profile_role() to anon, authenticated, service_role;
grant execute on function public.has_staff_role(public.user_role) to anon, authenticated, service_role;
grant execute on function public.is_verified_user() to anon, authenticated, service_role;
grant execute on function public.is_vendor_member(uuid, public.vendor_member_role) to anon, authenticated, service_role;
grant execute on function public.can_post_official(uuid) to anon, authenticated, service_role;
grant execute on function public.author_is_visible(uuid) to anon, authenticated, service_role;
grant execute on function public.get_my_profile() to authenticated;
