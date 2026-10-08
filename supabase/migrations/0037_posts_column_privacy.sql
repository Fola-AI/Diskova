-- 0037 · Post column privacy. A post's precise location, distance and moderation internals must never
-- be readable through the Data API or Realtime (§7.12: location is never shown publicly). Realtime
-- postgres_changes honours column privileges, so this also strips them from live payloads.
revoke select on public.posts from anon, authenticated;
grant select (
  id, author_id, vendor_id, event_id, kind, body, crowd_level, vibe, wait_minutes, cover_fee_ngn,
  is_at_venue, status, hold_reason, verified, like_count, expires_at, deleted_at, created_at, updated_at
) on public.posts to anon, authenticated;

-- Per-image moderation scores and perceptual hashes are internal too.
revoke select on public.post_media from anon, authenticated;
grant select (id, post_id, storage_path, kind, width, height, duration_s, blurhash, sort_order, processed_at, created_at)
  on public.post_media to anon, authenticated;
