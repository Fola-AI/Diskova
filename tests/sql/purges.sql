-- Daily purge jobs (§6.7, §7.12), exercised on fixtures inside a rolled-back transaction.
begin;
create temp table r (k text primary key, v text) on commit drop;

do $$
declare
  v_old uuid := gen_random_uuid();
  v_live uuid := gen_random_uuid();
  v_vendor uuid;
  v_post uuid;
  v_req uuid;
  v_req_docs uuid;
  v_result jsonb;
begin
  -- A user who deleted their account 25 h ago (self-delete leaves username intact until the purge).
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_old, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'purge-' || substr(v_old::text, 1, 8) || '@example.com', now(), '{}', '{}', now(), now());
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_live, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'purge-live-' || substr(v_live::text, 1, 8) || '@example.com', now(), '{}', '{}', now(), now());
  update public.profiles set display_name = 'Purge Me', bio = 'bio', deleted_at = now() - interval '25 hours' where id = v_old;
  update private.profile_meta set signup_ip = '203.0.113.9', last_ip = '203.0.113.9', signup_ua = 'ua' where profile_id = v_old;

  insert into public.vendors (slug, name, category_id, city_id, location, status)
  select 'purge-' || substr(v_old::text, 1, 8), 'Purge Vendor', (select id from public.categories limit 1), (select id from public.cities where slug = 'lagos'), 'SRID=4326;POINT(3.42 6.43)', 'published'
  returning id into v_vendor;

  -- An abandoned check-in: pending, never finalised, 25 h old.
  insert into public.posts (author_id, vendor_id, kind, crowd_level, body, status, created_at)
  values (v_live, v_vendor, 'checkin', 3, 'abandoned body', 'pending', now() - interval '25 hours') returning id into v_post;
  update public.posts set status = 'pending', moderation_decision = null, hold_reason = 'none' where id = v_post;

  -- Verification requests decided 31 days ago: one with no stored files, one with files.
  insert into private.vendor_verification_requests (vendor_id, submitted_by, status, reviewed_at)
  values (v_vendor, v_old, 'approved', now() - interval '31 days') returning id into v_req;
  insert into private.vendor_verification_requests (vendor_id, submitted_by, status, reviewed_at, business_doc_path)
  values (v_vendor, v_old, 'rejected', now() - interval '31 days', 'test/' || v_old || '/doc.pdf') returning id into v_req_docs;

  -- A crowd snapshot older than the 70-day retention.
  insert into public.crowd_snapshots (vendor_id, bucket_start, crowd_level_avg, post_count, confidence) values (v_vendor, now() - interval '71 days', 3, 1, 'low');

  v_result := private.run_daily_purges();
  insert into r values ('result', v_result::text);

  insert into r select 'post_status', status::text from public.posts where id = v_post;
  insert into r select 'post_deleted', (deleted_at is not null)::text from public.posts where id = v_post;
  insert into r select 'live_author_untouched', (username::text not like 'deleted\_%')::text from public.profiles where id = v_live;
  insert into r select 'username_anonymised', (username::text like 'deleted\_%')::text from public.profiles where id = v_old;
  insert into r select 'display_name', coalesce(display_name, '∅') from public.profiles where id = v_old;
  insert into r select 'ip_cleared', (signup_ip is null and last_ip is null and signup_ua is null)::text from private.profile_meta where profile_id = v_old;
  insert into r select 'req_no_files_purged', (docs_purged_at is not null)::text from private.vendor_verification_requests where id = v_req;
  -- Without the Vault secrets (open question 4) storage deletes can't run: the row must NOT be marked purged.
  insert into r select 'req_with_files_marked', (docs_purged_at is not null)::text from private.vendor_verification_requests where id = v_req_docs;
  insert into r select 'old_snapshot_left', count(*)::text from public.crowd_snapshots where vendor_id = v_vendor;
  insert into r select 'audited', count(*)::text from private.audit_log where action = 'system.daily_purge' and at > now() - interval '1 minute';
  insert into r select 'vault_configured', (exists (select 1 from vault.decrypted_secrets where name = 'app_service_role_key'))::text;
end;
$$;

select json_object_agg(k, v) from r;
rollback;
