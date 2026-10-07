-- 0045 · moderation_items has no FK to its entity (it is polymorphic), so hard-deleting a post
-- (abandoned-upload purge, vendor deletion cascade) left its queue item open forever. Close items
-- when the post row goes away, and close any existing orphans.
create or replace function private.close_moderation_for_deleted_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.moderation_items
     set status = 'done', closed_at = now(), outcome = 'entity_deleted'
   where entity_type = 'post' and entity_id = old.id and status <> 'done';
  return null;
end;
$$;
revoke all on function private.close_moderation_for_deleted_post() from public, anon, authenticated;

drop trigger if exists posts_close_moderation on public.posts;
create trigger posts_close_moderation after delete on public.posts
  for each row execute function private.close_moderation_for_deleted_post();

update public.moderation_items m
   set status = 'done', closed_at = now(), outcome = 'entity_deleted'
 where m.status <> 'done'
   and m.entity_type = 'post'
   and not exists (select 1 from public.posts p where p.id = m.entity_id);
