-- 0023 · Domain triggers (§6.4–§6.20)

-- ---------- vendors ----------------------------------------------------------------------------
-- An owner creating a vendor through onboarding claims it and becomes its owner member.
create or replace function private.vendors_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_profile_id is not null and not new.is_seed then
    new.claim_status := 'claimed';
  end if;
  return new;
end;
$$;
create trigger vendors_before_insert before insert on public.vendors
  for each row execute function private.vendors_before_insert();

create or replace function private.vendors_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_profile_id is not null then
    insert into public.vendor_members (vendor_id, profile_id, role, accepted_at)
    values (new.id, new.owner_profile_id, 'owner', now())
    on conflict (vendor_id, profile_id) do nothing;
  end if;
  return null;
end;
$$;
create trigger vendors_after_insert after insert on public.vendors
  for each row execute function private.vendors_after_insert();

-- API callers (vendor members) may only move a vendor draft/rejected → pending_review or withdraw
-- pending_review → draft. Publishing, suspension, rejection and verification are staff actions
-- performed server-side through the service role (and audited).
create or replace function private.vendors_guard_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_api_caller() and new.status is distinct from old.status then
    if not (
      (old.status in ('draft', 'rejected') and new.status = 'pending_review')
      or (old.status = 'pending_review' and new.status = 'draft')
    ) then
      raise exception 'vendor status change % → % is not allowed', old.status, new.status
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger vendors_guard_update before update on public.vendors
  for each row execute function private.vendors_guard_update();

-- ---------- vendor_members → profiles.role -----------------------------------------------------
create or replace function private.vendor_members_sync_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile uuid := coalesce(new.profile_id, old.profile_id);
begin
  if tg_op = 'INSERT' then
    update public.profiles set role = 'vendor_member' where id = v_profile and role = 'user';
  elsif tg_op = 'DELETE' then
    if not exists (select 1 from public.vendor_members m where m.profile_id = v_profile) then
      update public.profiles set role = 'user' where id = v_profile and role = 'vendor_member';
    end if;
  end if;
  return null;
end;
$$;
create trigger vendor_members_sync_role after insert or delete on public.vendor_members
  for each row execute function private.vendor_members_sync_role();

-- ---------- posts ------------------------------------------------------------------------------
-- Server-computed fields (API callers have no column privilege on them, so they can't be spoofed):
-- distance / is_at_venue (soft signal, < 300 m), expires_at, and pulse auto-publish (§8.3).
create or replace function private.posts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hours int;
  v_distance double precision;
begin
  if new.location is not null then
    select extensions.st_distance(new.location, v.location) into v_distance
      from public.vendors v where v.id = new.vendor_id;
    new.distance_from_venue_m := round(v_distance)::int;
    new.is_at_venue := v_distance is not null and v_distance < 300;
  else
    new.distance_from_venue_m := null;
    new.is_at_venue := false;
  end if;

  if new.expires_at is null then
    select s.checkin_expiry_hours into v_hours from public.platform_settings s where s.id = 1;
    new.expires_at := case
      when new.kind in ('checkin', 'pulse') then now() + make_interval(hours => coalesce(v_hours, 12))
      else now() + interval '24 hours'
    end;
  end if;

  -- Pulse: crowd level only, no media, no text → never held, publishes immediately.
  if new.kind = 'pulse' then
    new.body := null;
    new.status := 'published';
    new.hold_reason := 'none';
    new.moderation_decision := 'auto_pass';
  end if;
  return new;
end;
$$;
create trigger posts_before_insert before insert on public.posts
  for each row execute function private.posts_before_insert();

create or replace function private.posts_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_decision_changed boolean := tg_op = 'INSERT' or old.moderation_decision is distinct from new.moderation_decision;
  v_hold_changed boolean := tg_op = 'INSERT' or old.hold_reason is distinct from new.hold_reason;
  v_published_now boolean := new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published');
begin
  if tg_op = 'INSERT' then
    update public.profiles set post_count = post_count + 1 where id = new.author_id;
  end if;

  -- §6.16 moderation queue population
  if v_decision_changed and new.moderation_decision = 'auto_block' then
    insert into public.moderation_items (entity_type, entity_id, priority, source)
    values ('post', new.id, 1, 'auto_block')
    on conflict (entity_type, entity_id, source) where status <> 'done' do nothing;
  elsif v_decision_changed and new.moderation_decision = 'auto_flag' then
    insert into public.moderation_items (entity_type, entity_id, priority, source)
    values ('post', new.id, 2, 'auto_flag')
    on conflict (entity_type, entity_id, source) where status <> 'done' do nothing;
  elsif v_decision_changed and new.moderation_decision = 'auto_pass' and random() < 0.02 then
    insert into public.moderation_items (entity_type, entity_id, priority, source)
    values ('post', new.id, 5, 'random_sample')
    on conflict (entity_type, entity_id, source) where status <> 'done' do nothing;
  end if;

  if v_hold_changed and new.hold_reason <> 'none' then
    insert into public.moderation_items (entity_type, entity_id, priority, source)
    values ('post', new.id, 2, 'hold')
    on conflict (entity_type, entity_id, source) where status <> 'done' do nothing;
  end if;

  if v_published_now then
    update public.vendors
       set last_activity_at = now(),
           last_official_update_at = case when new.kind = 'official' then now() else last_official_update_at end
     where id = new.vendor_id;
  end if;
  return null;
end;
$$;
create trigger posts_after_write after insert or update of status, moderation_decision, hold_reason on public.posts
  for each row execute function private.posts_after_write();

-- ---------- reports (§8.5 rule 7) --------------------------------------------------------------
-- 1 report from trust ≥ 70, or 2 from anyone → P2 item. 3+ → post auto-hidden pending review (P1).
-- A report from a member of the post's own vendor is a vendor dispute → P2 'vendor_dispute'.
create or replace function private.reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trust int;
  v_count int;
  v_post_vendor uuid;
  v_is_dispute boolean := false;
begin
  select p.trust_score into v_trust from public.profiles p where p.id = new.reporter_id;
  select count(*) into v_count from public.reports r
   where r.entity_type = new.entity_type and r.entity_id = new.entity_id
     and r.status in ('open', 'reviewing');

  if new.entity_type = 'post' then
    update public.posts set report_count = report_count + 1 where id = new.entity_id
      returning vendor_id into v_post_vendor;
    v_is_dispute := v_post_vendor is not null and exists (
      select 1 from public.vendor_members m
       where m.vendor_id = v_post_vendor and m.profile_id = new.reporter_id and m.accepted_at is not null
    );
  end if;

  if v_is_dispute then
    insert into public.moderation_items (entity_type, entity_id, priority, source)
    values ('post', new.entity_id, 2, 'vendor_dispute')
    on conflict (entity_type, entity_id, source) where status <> 'done' do nothing;
  elsif coalesce(v_trust, 0) >= 70 or v_count >= 2 then
    insert into public.moderation_items (entity_type, entity_id, priority, source)
    values (new.entity_type::text, new.entity_id, 2, 'user_report')
    on conflict (entity_type, entity_id, source) where status <> 'done' do nothing;
  end if;

  if new.entity_type = 'post' and v_count >= 3 then
    update public.posts set status = 'hidden' where id = new.entity_id and status = 'published';
    update public.moderation_items set priority = 1
     where entity_type = 'post' and entity_id = new.entity_id and source = 'user_report' and status <> 'done';
  end if;
  return null;
end;
$$;
create trigger reports_after_insert after insert on public.reports
  for each row execute function private.reports_after_insert();

-- ---------- user_sanctions → profiles.status / is_shadowbanned (§6.17) ---------------------------
create or replace function private.recompute_profile_sanctions(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_top record;
  v_shadow boolean;
begin
  select exists (
    select 1 from public.user_sanctions s
     where s.profile_id = p_profile_id and s.kind = 'shadowban' and s.lifted_at is null
       and (s.expires_at is null or s.expires_at > now())
  ) into v_shadow;

  select s.kind, s.reason, s.expires_at into v_top
    from public.user_sanctions s
   where s.profile_id = p_profile_id and s.kind in ('ban', 'suspension', 'warning')
     and s.lifted_at is null and (s.expires_at is null or s.expires_at > now())
   order by case s.kind when 'ban' then 1 when 'suspension' then 2 else 3 end, s.issued_at desc
   limit 1;

  update public.profiles p
     set is_shadowbanned = v_shadow,
         status = case v_top.kind
                    when 'ban' then 'banned'::public.profile_status
                    when 'suspension' then 'suspended'::public.profile_status
                    when 'warning' then 'warned'::public.profile_status
                    else 'active'::public.profile_status
                  end,
         status_reason = v_top.reason,
         status_until = v_top.expires_at
   where p.id = p_profile_id;
end;
$$;

create or replace function private.user_sanctions_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.recompute_profile_sanctions(coalesce(new.profile_id, old.profile_id));
  return null;
end;
$$;
create trigger user_sanctions_sync after insert or update or delete on public.user_sanctions
  for each row execute function private.user_sanctions_sync();

-- ---------- events: season flag + status guard (§6.13) -----------------------------------------
create or replace function private.events_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start date;
  v_end date;
  v_day date;
begin
  if private.is_api_caller() and new.status not in ('draft', 'pending_review') then
    raise exception 'event status % can only be set by staff', new.status using errcode = '42501';
  end if;

  select s.december_season_start, s.december_season_end into v_start, v_end
    from public.platform_settings s where s.id = 1;
  v_day := (new.starts_at at time zone coalesce(new.timezone, 'Africa/Lagos'))::date;
  new.is_december_season := v_start is not null and v_end is not null and v_day between v_start and v_end;
  return new;
end;
$$;
create trigger events_before_write before insert or update on public.events
  for each row execute function private.events_before_write();

-- Changing the season dates re-flags every event.
create or replace function private.platform_settings_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.december_season_start is distinct from old.december_season_start
     or new.december_season_end is distinct from old.december_season_end then
    update public.events e
       set is_december_season = new.december_season_start is not null
             and new.december_season_end is not null
             and (e.starts_at at time zone coalesce(e.timezone, 'Africa/Lagos'))::date
                 between new.december_season_start and new.december_season_end;
  end if;
  return null;
end;
$$;
create trigger platform_settings_after_update after update on public.platform_settings
  for each row execute function private.platform_settings_after_update();

-- ---------- point_events → running totals ------------------------------------------------------
create or replace function private.point_events_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.profile_id is not null then
    update public.profiles set points = greatest(0, points + new.points) where id = new.profile_id;
  end if;
  if new.vendor_id is not null and new.kind = 'official_update' then
    update public.vendors set points = greatest(0, points + new.points) where id = new.vendor_id;
  end if;
  return null;
end;
$$;
create trigger point_events_after_insert after insert on public.point_events
  for each row execute function private.point_events_after_insert();

-- ---------- guides → revisions -----------------------------------------------------------------
create or replace function private.guides_save_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.body_md is distinct from old.body_md then
    insert into public.guide_revisions (guide_id, body_md, saved_by)
    values (new.id, new.body_md, coalesce(auth.uid(), new.updated_by, new.author_profile_id));
  end if;
  return null;
end;
$$;
create trigger guides_save_revision after insert or update of body_md on public.guides
  for each row execute function private.guides_save_revision();
