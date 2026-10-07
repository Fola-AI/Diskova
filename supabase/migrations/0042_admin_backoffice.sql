-- 0042 · Back office (§11): activity stream logging + service-role RPCs for admin tables.

-- ---------- activity_events producers (§6.23, §11.1 live stream) --------------------------------
create or replace function private.log_activity(p_kind text, p_city uuid, p_vendor uuid, p_profile uuid, p_meta jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events (kind, city_id, vendor_id, profile_id, meta)
  values (p_kind, p_city, p_vendor, p_profile, coalesce(p_meta, '{}'::jsonb));
$$;

create or replace function private.activity_from_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_city uuid;
begin
  if tg_table_name = 'profiles' and tg_op = 'INSERT' then
    perform private.log_activity('user.signup', null, null, new.id, jsonb_build_object('username', new.username));
  elsif tg_table_name = 'posts' then
    select city_id into v_city from public.vendors where id = new.vendor_id;
    if tg_op = 'INSERT' then
      perform private.log_activity('post.' || new.kind, v_city, new.vendor_id, new.author_id, jsonb_build_object('post_id', new.id, 'status', new.status));
    elsif new.status is distinct from old.status then
      perform private.log_activity('post.' || new.status, v_city, new.vendor_id, new.author_id, jsonb_build_object('post_id', new.id, 'kind', new.kind));
    end if;
  elsif tg_table_name = 'vendors' then
    if tg_op = 'INSERT' then
      perform private.log_activity('vendor.created', new.city_id, new.id, new.owner_profile_id, jsonb_build_object('name', new.name));
    elsif new.status is distinct from old.status or new.verified is distinct from old.verified then
      perform private.log_activity('vendor.' || case when new.verified and not old.verified then 'verified' else new.status::text end, new.city_id, new.id, new.owner_profile_id, jsonb_build_object('name', new.name));
    end if;
  elsif tg_table_name = 'events' and tg_op = 'INSERT' then
    perform private.log_activity('event.submitted', new.city_id, new.vendor_id, new.submitted_by, jsonb_build_object('title', new.title));
  elsif tg_table_name = 'reports' and tg_op = 'INSERT' then
    perform private.log_activity('report.created', null, null, new.reporter_id, jsonb_build_object('entity_type', new.entity_type, 'reason', new.reason));
  elsif tg_table_name = 'user_sanctions' and tg_op = 'INSERT' then
    perform private.log_activity('sanction.' || new.kind, null, null, new.profile_id, jsonb_build_object('issued_by', new.issued_by));
  end if;
  return null;
end;
$$;

create trigger activity_profiles after insert on public.profiles for each row execute function private.activity_from_row();
create trigger activity_posts after insert or update of status on public.posts for each row execute function private.activity_from_row();
create trigger activity_vendors after insert or update of status, verified on public.vendors for each row execute function private.activity_from_row();
create trigger activity_events_ins after insert on public.events for each row execute function private.activity_from_row();
create trigger activity_reports after insert on public.reports for each row execute function private.activity_from_row();
create trigger activity_sanctions after insert on public.user_sanctions for each row execute function private.activity_from_row();

-- ---------- dashboard ------------------------------------------------------------------------
create or replace function public.admin_platform_summary()
returns jsonb language sql stable security definer set search_path = ''
as $$ select to_jsonb(s) from private.v_platform_summary s $$;

create or replace function public.admin_moderation_stats()
returns jsonb language sql stable security definer set search_path = ''
as $$ select to_jsonb(s) from private.v_moderation_stats s $$;

-- Daily series for sparklines (Lagos days, oldest first).
create or replace function public.admin_daily_counts(p_days int default 14)
returns table (day date, signups int, posts int, official_updates int, checkins int, pulses int, vendors int)
language sql stable security definer set search_path = ''
as $$
  with days as (
    select generate_series((now() at time zone 'Africa/Lagos')::date - (least(greatest(p_days, 1), 90) - 1), (now() at time zone 'Africa/Lagos')::date, interval '1 day')::date as day
  )
  select d.day,
    (select count(*) from public.profiles p where (p.created_at at time zone 'Africa/Lagos')::date = d.day)::int,
    (select count(*) from public.posts p where (p.created_at at time zone 'Africa/Lagos')::date = d.day)::int,
    (select count(*) from public.posts p where p.kind = 'official' and (p.created_at at time zone 'Africa/Lagos')::date = d.day)::int,
    (select count(*) from public.posts p where p.kind = 'checkin' and (p.created_at at time zone 'Africa/Lagos')::date = d.day)::int,
    (select count(*) from public.posts p where p.kind = 'pulse' and (p.created_at at time zone 'Africa/Lagos')::date = d.day)::int,
    (select count(*) from public.vendors v where not v.is_seed and (v.created_at at time zone 'Africa/Lagos')::date = d.day)::int
  from days d order by d.day;
$$;

create or replace function public.admin_list_activity(p_limit int default 50, p_kind_prefix text default null, p_city_id uuid default null, p_vendor_id uuid default null, p_profile_id uuid default null)
returns table (id bigint, at timestamptz, kind text, city_id uuid, vendor_id uuid, profile_id uuid, meta jsonb, city_name text, vendor_name text, username text)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.at, e.kind, e.city_id, e.vendor_id, e.profile_id, e.meta, c.name, v.name, p.username::text
    from public.activity_events e
    left join public.cities c on c.id = e.city_id
    left join public.vendors v on v.id = e.vendor_id
    left join public.profiles p on p.id = e.profile_id
   where e.at > now() - interval '30 days'
     and (p_kind_prefix is null or e.kind like p_kind_prefix || '%')
     and (p_city_id is null or e.city_id = p_city_id)
     and (p_vendor_id is null or e.vendor_id = p_vendor_id)
     and (p_profile_id is null or e.profile_id = p_profile_id)
   order by e.at desc
   limit least(greatest(p_limit, 1), 200);
$$;

-- ---------- vendors table (§11.2) ------------------------------------------------------------
create or replace function public.admin_list_vendors(
  p_q text default null, p_status public.vendor_status default null, p_city_id uuid default null, p_area_id uuid default null,
  p_category_id uuid default null, p_verified boolean default null, p_claim public.claim_status default null,
  p_no_prices boolean default false, p_no_photos boolean default false, p_never_posted boolean default false,
  p_sort text default 'created_at', p_desc boolean default true, p_limit int default 50, p_offset int default 0
)
returns table (
  id uuid, slug text, name text, city text, area text, category text, status public.vendor_status, verified boolean,
  claim_status public.claim_status, owner_username text, completeness int, official_updates_7d bigint, posts_7d bigint,
  open_reports bigint, has_prices boolean, has_photos boolean, never_posted boolean, last_activity_at timestamptz,
  created_at timestamptz, is_seed boolean, total bigint
)
language sql stable security definer set search_path = ''
as $$
  with h as (
    select vh.*, c.name as city_name, a.name as area_name, cat.name as category_name, p.username::text as owner_name
      from private.v_vendor_health vh
      left join public.cities c on c.id = vh.city_id
      left join public.areas a on a.id = vh.area_id
      left join public.categories cat on cat.id = vh.category_id
      left join public.profiles p on p.id = vh.owner_profile_id
     where (p_q is null or vh.name ilike '%' || p_q || '%' or vh.slug ilike '%' || p_q || '%')
       and (p_status is null or vh.status = p_status)
       and (p_city_id is null or vh.city_id = p_city_id)
       and (p_area_id is null or vh.area_id = p_area_id)
       and (p_category_id is null or vh.category_id = p_category_id)
       and (p_verified is null or vh.verified = p_verified)
       and (p_claim is null or vh.claim_status = p_claim)
       and (not p_no_prices or not vh.has_prices)
       and (not p_no_photos or not vh.has_photos)
       and (not p_never_posted or vh.never_posted)
  )
  select h.id, h.slug, h.name, h.city_name, h.area_name, h.category_name, h.status, h.verified, h.claim_status, h.owner_name,
         h.completeness, h.official_updates_7d, h.posts_7d, h.open_reports, h.has_prices, h.has_photos, h.never_posted,
         h.last_activity_at, h.created_at, h.is_seed, count(*) over ()
    from h
   order by
     case when p_sort = 'name' and not p_desc then h.name end asc, case when p_sort = 'name' and p_desc then h.name end desc,
     case when p_sort = 'city' and not p_desc then h.city_name end asc, case when p_sort = 'city' and p_desc then h.city_name end desc,
     case when p_sort = 'status' and not p_desc then h.status end asc, case when p_sort = 'status' and p_desc then h.status end desc,
     case when p_sort = 'completeness' and not p_desc then h.completeness end asc, case when p_sort = 'completeness' and p_desc then h.completeness end desc,
     case when p_sort = 'official_updates_7d' and not p_desc then h.official_updates_7d end asc, case when p_sort = 'official_updates_7d' and p_desc then h.official_updates_7d end desc,
     case when p_sort = 'posts_7d' and not p_desc then h.posts_7d end asc, case when p_sort = 'posts_7d' and p_desc then h.posts_7d end desc,
     case when p_sort = 'open_reports' and not p_desc then h.open_reports end asc, case when p_sort = 'open_reports' and p_desc then h.open_reports end desc,
     case when p_sort = 'last_activity_at' and not p_desc then h.last_activity_at end asc nulls first, case when p_sort = 'last_activity_at' and p_desc then h.last_activity_at end desc nulls last,
     case when p_sort = 'created_at' and not p_desc then h.created_at end asc, case when p_sort = 'created_at' and p_desc then h.created_at end desc,
     h.name
   limit least(greatest(p_limit, 1), 5000) offset greatest(p_offset, 0);
$$;

-- ---------- users table (§11.4). Email / IP only when the caller (service) asks for them. -------
create or replace function public.admin_list_users(
  p_q text default null, p_role public.user_role default null, p_status public.profile_status default null,
  p_shadowbanned boolean default null, p_include_email boolean default false, p_include_ip boolean default false,
  p_sort text default 'created_at', p_desc boolean default true, p_limit int default 50, p_offset int default 0
)
returns table (
  id uuid, username text, display_name text, email text, role public.user_role, status public.profile_status,
  is_shadowbanned boolean, trust_score int, points int, post_count int, created_at timestamptz,
  last_seen_at timestamptz, deleted_at timestamptz, email_verified boolean, signup_ip text, last_ip text, total bigint
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.username::text, p.display_name, case when p_include_email then u.email::text end, p.role, p.status,
         p.is_shadowbanned, p.trust_score, p.points, p.post_count, p.created_at, p.last_seen_at, p.deleted_at,
         p.email_verified_at is not null,
         case when p_include_ip then host(m.signup_ip) end, case when p_include_ip then host(m.last_ip) end,
         count(*) over ()
    from public.profiles p
    join auth.users u on u.id = p.id
    left join private.profile_meta m on m.profile_id = p.id
   where (p_q is null or p.username::text ilike '%' || p_q || '%' or p.display_name ilike '%' || p_q || '%'
          or (p_include_email and u.email ilike '%' || p_q || '%'))
     and (p_role is null or p.role = p_role)
     and (p_status is null or p.status = p_status)
     and (p_shadowbanned is null or p.is_shadowbanned = p_shadowbanned)
   order by
     case when p_sort = 'username' and not p_desc then p.username end asc, case when p_sort = 'username' and p_desc then p.username end desc,
     case when p_sort = 'trust_score' and not p_desc then p.trust_score end asc, case when p_sort = 'trust_score' and p_desc then p.trust_score end desc,
     case when p_sort = 'points' and not p_desc then p.points end asc, case when p_sort = 'points' and p_desc then p.points end desc,
     case when p_sort = 'post_count' and not p_desc then p.post_count end asc, case when p_sort = 'post_count' and p_desc then p.post_count end desc,
     case when p_sort = 'created_at' and not p_desc then p.created_at end asc, case when p_sort = 'created_at' and p_desc then p.created_at end desc,
     p.username
   limit least(greatest(p_limit, 1), 5000) offset greatest(p_offset, 0);
$$;

-- Informational device/IP clustering for one user (super_admin view only; never used for automatic action).
create or replace function public.admin_user_network(p_profile_id uuid)
returns table (signup_ip text, last_ip text, signup_ua text, device_hash text, accounts_sharing_ip bigint)
language sql stable security definer set search_path = ''
as $$
  select host(m.signup_ip), host(m.last_ip), m.signup_ua, m.device_hash,
         (select count(*) from private.profile_meta o where o.profile_id <> m.profile_id and m.last_ip is not null and (o.last_ip = m.last_ip or o.signup_ip = m.last_ip))
    from private.profile_meta m where m.profile_id = p_profile_id;
$$;

-- Force logout: drop the user's refresh sessions (access tokens lapse within jwt_exp, 1 h).
create or replace function public.admin_force_logout(p_profile_id uuid)
returns int language plpgsql security definer set search_path = ''
as $$
declare v_n int;
begin
  delete from auth.sessions where user_id = p_profile_id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Possible duplicate events (same city + day, similar titles) — §11.6.
create or replace function public.admin_event_duplicates(p_limit int default 50)
returns table (a_id uuid, a_title text, a_slug text, b_id uuid, b_title text, b_slug text, day date, similarity real)
language sql stable security definer set search_path = ''
as $$
  select a.id, a.title, a.slug, b.id, b.title, b.slug, (a.starts_at at time zone 'Africa/Lagos')::date,
         extensions.similarity(lower(a.title), lower(b.title))
    from public.events a
    join public.events b on b.city_id = a.city_id and b.id > a.id
     and (b.starts_at at time zone 'Africa/Lagos')::date = (a.starts_at at time zone 'Africa/Lagos')::date
   where a.deleted_at is null and b.deleted_at is null
     and a.status in ('pending_review', 'published') and b.status in ('pending_review', 'published')
     and a.starts_at > now() - interval '1 day'
     and extensions.similarity(lower(a.title), lower(b.title)) > 0.5
   order by 8 desc
   limit least(greatest(p_limit, 1), 200);
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_platform_summary()', 'public.admin_moderation_stats()', 'public.admin_daily_counts(int)',
    'public.admin_list_activity(int, text, uuid, uuid, uuid)',
    'public.admin_list_vendors(text, public.vendor_status, uuid, uuid, uuid, boolean, public.claim_status, boolean, boolean, boolean, text, boolean, int, int)',
    'public.admin_list_users(text, public.user_role, public.profile_status, boolean, boolean, boolean, text, boolean, int, int)',
    'public.admin_user_network(uuid)', 'public.admin_force_logout(uuid)', 'public.admin_event_duplicates(int)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;

-- Private bucket for data exports (signed links) and weekly backups (§7.13, §11.14).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exports', 'exports', false, 104857600, array['text/csv', 'application/json', 'application/gzip'])
on conflict (id) do nothing;
