-- 0024 · Attach the row-change audit trigger to every user-facing / privileged table (§6.14, CLAUDE.md).
-- Not audited: crowd_snapshots / crowd_forecast (pg_cron output), activity_events (itself a log),
-- point_events (system totals; manual adjustments are audited explicitly), guide_revisions
-- (guides are audited), private.profile_meta (informational IP data — not copied into the log).
do $$
declare
  t text;
begin
  foreach t in array array[
    'public.cities', 'public.areas', 'public.categories', 'public.profiles', 'public.vendors',
    'public.vendor_members', 'public.vendor_prices', 'private.vendor_verification_requests',
    'public.events', 'public.posts', 'public.post_media', 'public.reports', 'public.moderation_items',
    'public.user_sanctions', 'public.guides', 'public.safety_info', 'private.issue_reports',
    'public.admin_tasks', 'public.platform_settings'
  ] loop
    execute format(
      'create trigger audit_row_change after insert or update or delete on %s
         for each row execute function private.audit_row_change()', t);
  end loop;
end;
$$;
