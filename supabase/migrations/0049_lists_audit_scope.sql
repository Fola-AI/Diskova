-- 0049 · Don't audit / re-stamp a list on every share-page view (view_count-only updates).
drop trigger if exists audit_row_change on public.lists;
create trigger audit_row_change_ins_del after insert or delete on public.lists
  for each row execute function private.audit_row_change();
create trigger audit_row_change_upd after update on public.lists
  for each row when (old.title is distinct from new.title or old.is_public is distinct from new.is_public
                     or old.city_id is distinct from new.city_id or old.owner_id is distinct from new.owner_id)
  execute function private.audit_row_change();

drop trigger if exists lists_updated_at on public.lists;
create trigger lists_updated_at before update on public.lists
  for each row when (old.view_count is not distinct from new.view_count)
  execute function private.set_updated_at();
