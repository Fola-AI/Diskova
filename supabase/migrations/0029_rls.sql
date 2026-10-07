-- 0029 · Row Level Security + explicit grants (§7.1). Default deny everywhere.
-- Auto-expose is OFF on this project, so nothing is reachable without the grants below.
-- Writes that change server-owned state (publishing, moderation, verification, sanctions, points)
-- are NOT granted to API roles: they happen in /lib/services through the service role, behind
-- requireRole() + aal2, and are audited.

-- Start from zero for API roles on everything in public.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

-- Service role: full table access (it bypasses RLS; used only server-side via lib/admin-db).
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Make sure RLS is on for every table in public (belt and braces; each table migration enabled it).
do $$
declare r record;
begin
  for r in select c.oid::regclass as tbl from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname in ('public', 'private') and c.relkind in ('r', 'p')
  loop
    execute format('alter table %s enable row level security', r.tbl);
  end loop;
end;
$$;

-- ============ reference data ============
grant select on public.cities, public.areas, public.categories to anon, authenticated;

create policy cities_read on public.cities for select to anon, authenticated
  using (is_active or (select public.has_staff_role('admin')));
create policy areas_read on public.areas for select to anon, authenticated
  using (is_active or (select public.has_staff_role('admin')));
create policy categories_read on public.categories for select to anon, authenticated
  using (true);

-- ============ profiles ============
-- Column privileges: only public fields are readable by others. Owners read their full row via
-- public.get_my_profile(). is_shadowbanned / trust_score / status are never readable by API roles.
grant select (id, username, display_name, avatar_url, bio, badges, points, post_count, created_at, deleted_at)
  on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url, bio, home_city_id, is_diaspora, location_consent, last_seen_at)
  on public.profiles to authenticated;

create policy profiles_read on public.profiles for select to anon, authenticated
  using (deleted_at is null or id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()));

-- ============ vendors ============
grant select on public.vendors to anon, authenticated;
grant insert (
  slug, name, tagline, description_md, category_id, secondary_category_ids, city_id, area_id,
  address_line, location, phone, whatsapp, email, website_url, booking_url, instagram_handle,
  tiktok_handle, x_handle, cover_image_url, logo_url, gallery, opening_hours, price_band, dress_code,
  age_policy, parking_note, late_night_area_note, features, owner_profile_id
) on public.vendors to authenticated;
grant update (
  name, tagline, description_md, category_id, secondary_category_ids, area_id, address_line,
  location, phone, whatsapp, email, website_url, booking_url, instagram_handle, tiktok_handle,
  x_handle, cover_image_url, logo_url, gallery, opening_hours, price_band, dress_code, age_policy,
  parking_note, late_night_area_note, features, status
) on public.vendors to authenticated;

create policy vendors_read on public.vendors for select to anon, authenticated
  using (
    (status = 'published' and deleted_at is null)
    or owner_profile_id = (select auth.uid())
    or public.is_vendor_member(id)
    or (select public.has_staff_role('moderator'))
  );
create policy vendors_insert_owner on public.vendors for insert to authenticated
  with check (owner_profile_id = (select auth.uid()) and (select public.is_verified_user()));
-- Owners and managers edit; status transitions are further limited by vendors_guard_update.
create policy vendors_update_manager on public.vendors for update to authenticated
  using (deleted_at is null and public.is_vendor_member(id, 'manager'))
  with check (public.is_vendor_member(id, 'manager'));

-- ============ vendor_members ============ (invites/role changes go through services)
grant select on public.vendor_members to authenticated;
create policy vendor_members_read on public.vendor_members for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.is_vendor_member(vendor_id)
    or (select public.has_staff_role('moderator'))
  );

-- ============ vendor_prices ============
grant select on public.vendor_prices to anon, authenticated;
grant insert (vendor_id, label, amount_ngn, note, valid_from, valid_to, is_active),
      update (label, amount_ngn, note, valid_from, valid_to, is_active),
      delete
  on public.vendor_prices to authenticated;

create policy vendor_prices_read on public.vendor_prices for select to anon, authenticated
  using (
    (is_active and exists (
      select 1 from public.vendors v
       where v.id = vendor_id and v.status = 'published' and v.deleted_at is null))
    or public.is_vendor_member(vendor_id)
  );
create policy vendor_prices_insert on public.vendor_prices for insert to authenticated
  with check (public.is_vendor_member(vendor_id, 'manager'));
create policy vendor_prices_update on public.vendor_prices for update to authenticated
  using (public.is_vendor_member(vendor_id, 'manager'))
  with check (public.is_vendor_member(vendor_id, 'manager'));
create policy vendor_prices_delete on public.vendor_prices for delete to authenticated
  using (public.is_vendor_member(vendor_id, 'manager'));

-- ============ events ============
grant select on public.events to anon, authenticated;
grant insert (
  slug, title, description_md, vendor_id, venue_vendor_id, venue_name_freeform, city_id, area_id,
  location, starts_at, ends_at, timezone, cover_image_url, category, ticket_url, price_from_ngn,
  price_to_ngn, is_free, status, submitted_by
) on public.events to authenticated;
grant update (
  title, description_md, venue_vendor_id, venue_name_freeform, area_id, location, starts_at, ends_at,
  timezone, cover_image_url, category, ticket_url, price_from_ngn, price_to_ngn, is_free, status
) on public.events to authenticated;

create policy events_read on public.events for select to anon, authenticated
  using (
    (status in ('published', 'cancelled') and deleted_at is null)
    or submitted_by = (select auth.uid())
    or (vendor_id is not null and public.is_vendor_member(vendor_id))
    or (select public.has_staff_role('moderator'))
  );
create policy events_insert on public.events for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and (select public.is_verified_user())
    and status in ('draft', 'pending_review')
    and (vendor_id is null or public.is_vendor_member(vendor_id))
  );
create policy events_update_own_unpublished on public.events for update to authenticated
  using (
    status in ('draft', 'pending_review') and deleted_at is null
    and (submitted_by = (select auth.uid()) or (vendor_id is not null and public.is_vendor_member(vendor_id)))
  )
  with check (
    status in ('draft', 'pending_review')
    and (submitted_by = (select auth.uid()) or (vendor_id is not null and public.is_vendor_member(vendor_id)))
  );

-- ============ posts ============ (§6.9, §6.17)
grant select on public.posts to anon, authenticated;
grant insert (author_id, vendor_id, event_id, kind, body, crowd_level, vibe, wait_minutes, cover_fee_ngn, location)
  on public.posts to authenticated;
grant update (deleted_at) on public.posts to authenticated;

-- Others see published, non-deleted posts by non-shadowbanned authors. Authors see their own posts
-- in every state (incl. pending/held). Staff (aal2) see everything.
create policy posts_read on public.posts for select to anon, authenticated
  using (
    (status = 'published' and deleted_at is null and public.author_is_visible(author_id))
    or (author_id = (select auth.uid()) and deleted_at is null)
    or (select public.has_staff_role('moderator'))
  );
create policy posts_insert on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select public.is_verified_user())
    and (
      (kind in ('checkin', 'pulse') and exists (
         select 1 from public.vendors v
          where v.id = vendor_id and v.status = 'published' and v.deleted_at is null))
      or (kind in ('official', 'update') and public.can_post_official(vendor_id))
    )
  );
-- Authors may soft-delete their own posts (deleted_at is the only updatable column).
create policy posts_delete_own on public.posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- ============ post_media ============ (rows written only by the media pipeline / service role)
grant select on public.post_media to anon, authenticated;
create policy post_media_read on public.post_media for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id)); -- inherits posts RLS

-- ============ crowd ============
grant select on public.crowd_snapshots, public.crowd_forecast to anon, authenticated;
create policy crowd_snapshots_read on public.crowd_snapshots for select to anon, authenticated using (true);
create policy crowd_forecast_read on public.crowd_forecast for select to anon, authenticated using (true);

-- ============ reports ============
grant select on public.reports to authenticated;
grant insert (reporter_id, entity_type, entity_id, reason, details) on public.reports to authenticated;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select public.is_verified_user()));
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.has_staff_role('moderator')));

-- ============ moderation / sanctions / tasks (staff only, aal2) ============
grant select on public.moderation_items, public.user_sanctions, public.admin_tasks to authenticated;
create policy moderation_items_staff on public.moderation_items for select to authenticated
  using ((select public.has_staff_role('moderator')));
-- Users may see their own warnings/suspensions/bans — never a shadowban.
create policy user_sanctions_read on public.user_sanctions for select to authenticated
  using (
    (profile_id = (select auth.uid()) and kind <> 'shadowban')
    or (select public.has_staff_role('moderator'))
  );
create policy admin_tasks_staff on public.admin_tasks for select to authenticated
  using ((select public.has_staff_role('moderator')));

-- ============ guides / CMS ============
grant select on public.guides to anon, authenticated;
grant select on public.guide_revisions to authenticated;
create policy guides_read on public.guides for select to anon, authenticated
  using ((status = 'published' and deleted_at is null) or (select public.has_staff_role('admin')));
create policy guide_revisions_staff on public.guide_revisions for select to authenticated
  using ((select public.has_staff_role('admin')));

-- ============ safety (information only) ============
grant select on public.safety_info to anon, authenticated;
create policy safety_info_read on public.safety_info for select to anon, authenticated using (true);

-- ============ points ============
grant select on public.point_events to authenticated;
create policy point_events_read on public.point_events for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (vendor_id is not null and profile_id is null and public.is_vendor_member(vendor_id))
    or (select public.has_staff_role('moderator'))
  );
grant select on public.v_leaderboard_month, public.v_leaderboard_december to anon, authenticated;

-- ============ platform_settings ============ (thresholds + blocklist stay server-side)
grant select (id, listing_is_free, monetisation_notice_md, checkin_expiry_hours, december_season_start,
              december_season_end, fx_gbp_per_ngn, fx_usd_per_ngn, maintenance_mode)
  on public.platform_settings to anon, authenticated;
create policy platform_settings_read on public.platform_settings for select to anon, authenticated using (true);

-- ============ activity_events ============ (admin live stream via Realtime, staff + aal2)
grant select on public.activity_events to authenticated;
create policy activity_events_staff on public.activity_events for select to authenticated
  using ((select public.has_staff_role('moderator')));
-- Partitions are reached only through the parent.
do $$
declare r record;
begin
  for r in select inhrelid::regclass as part from pg_inherits where inhparent = 'public.activity_events'::regclass loop
    execute format('revoke all on %s from anon, authenticated', r.part);
    execute format('alter table %s enable row level security', r.part);
  end loop;
end;
$$;

-- ============ views ============
grant select on public.v_public_profiles, public.v_live_now to anon, authenticated;

-- ============ private schema ============ (no API access at all, belt and braces)
revoke all on all tables in schema private from public, anon, authenticated, service_role;
revoke all on all sequences in schema private from public, anon, authenticated, service_role;
revoke all on all functions in schema private from public, anon, authenticated, service_role;
