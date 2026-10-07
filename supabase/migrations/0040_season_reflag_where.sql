-- 0040 · Fix: Supabase's pg-safeupdate rejects UPDATE without WHERE on API sessions, so changing the
-- season dates through the Data API failed inside this trigger. Only touch rows whose flag changes.
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
       set is_december_season = not e.is_december_season
     where e.is_december_season is distinct from (
             new.december_season_start is not null
             and new.december_season_end is not null
             and (e.starts_at at time zone coalesce(e.timezone, 'Africa/Lagos'))::date
                 between new.december_season_start and new.december_season_end
           );
  end if;
  return null;
end;
$$;
