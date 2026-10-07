-- 0048 · Stage P2 · saved lists ("Plan my night") + public share pages (§6.25 / PRD P2).
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  city_id uuid references public.cities(id) on delete set null,
  is_public boolean not null default false,
  -- 12 URL-safe random characters (nanoid-equivalent), generated here so clients can't choose it.
  share_token text not null unique default translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_')
    check (share_token ~ '^[A-Za-z0-9_-]{12}$'),
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lists_owner_idx on public.lists (owner_id, updated_at desc);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  note text check (char_length(note) <= 280),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check ((vendor_id is null) <> (event_id is null))
);
create unique index list_items_vendor_uniq on public.list_items (list_id, vendor_id) where vendor_id is not null;
create unique index list_items_event_uniq on public.list_items (list_id, event_id) where event_id is not null;
create index list_items_list_idx on public.list_items (list_id, sort_order);

create trigger lists_updated_at before update on public.lists for each row execute function private.set_updated_at();

-- Limits enforced in the database too (API callers can't bypass them): 20 lists per user, 50 items per list.
create or replace function private.lists_enforce_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'lists' then
    if (select count(*) from public.lists where owner_id = new.owner_id) >= 20 then
      raise exception 'You can have up to 20 lists.' using errcode = 'P0001';
    end if;
  else
    if (select count(*) from public.list_items where list_id = new.list_id) >= 50 then
      raise exception 'A list can hold up to 50 places and events.' using errcode = 'P0001';
    end if;
    update public.lists set updated_at = now() where id = new.list_id;
  end if;
  return new;
end;
$$;
create trigger lists_limit before insert on public.lists for each row execute function private.lists_enforce_limits();
create trigger list_items_limit before insert on public.list_items for each row execute function private.lists_enforce_limits();

create trigger audit_row_change after insert or update or delete on public.lists for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.list_items for each row execute function private.audit_row_change();

-- ---------- RLS: lists are private to their owner; public sharing goes through get_shared_list() ----------
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

grant select on public.lists to authenticated;
grant insert (title, city_id, is_public) on public.lists to authenticated;
grant update (title, city_id, is_public) on public.lists to authenticated;
grant delete on public.lists to authenticated;
create policy lists_owner_select on public.lists for select to authenticated using (owner_id = (select auth.uid()));
create policy lists_owner_insert on public.lists for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.is_verified_user()));
create policy lists_owner_update on public.lists for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy lists_owner_delete on public.lists for delete to authenticated using (owner_id = (select auth.uid()));

grant select on public.list_items to authenticated;
grant insert (list_id, vendor_id, event_id, note, sort_order) on public.list_items to authenticated;
grant update (note, sort_order) on public.list_items to authenticated;
grant delete on public.list_items to authenticated;
create policy list_items_owner on public.list_items for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.owner_id = (select auth.uid())));

-- ---------- public share page ----------
-- Only public lists, only by exact token (no enumeration). Items are limited to published venues/events.
create or replace function public.get_shared_list(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.id, 'title', l.title, 'token', l.share_token, 'updated_at', l.updated_at, 'view_count', l.view_count,
    'owner', jsonb_build_object('username', p.username, 'display_name', p.display_name),
    'city', case when c.id is null then null else jsonb_build_object('slug', c.slug, 'name', c.name, 'lat', extensions.st_y(c.centroid::extensions.geometry), 'lng', extensions.st_x(c.centroid::extensions.geometry)) end,
    'items', coalesce((
      select jsonb_agg(x.item order by x.sort_order, x.created_at)
        from (
          select i.sort_order, i.created_at, jsonb_build_object(
                   'id', i.id, 'note', i.note, 'kind', 'vendor',
                   'vendor', jsonb_build_object('id', v.id, 'slug', v.slug, 'name', v.name, 'tagline', v.tagline, 'price_band', v.price_band,
                     'cover_image_url', v.cover_image_url, 'lat', extensions.st_y(v.location::extensions.geometry), 'lng', extensions.st_x(v.location::extensions.geometry),
                     'category', (select cat.name from public.categories cat where cat.id = v.category_id),
                     'area', (select a.name from public.areas a where a.id = v.area_id),
                     'min_price', (select min(vp.amount_ngn) from public.vendor_prices vp where vp.vendor_id = v.id and vp.is_active and vp.amount_ngn > 0),
                     'max_price', (select max(vp.amount_ngn) from public.vendor_prices vp where vp.vendor_id = v.id and vp.is_active))) as item
            from public.list_items i join public.vendors v on v.id = i.vendor_id
           where i.list_id = l.id and v.status = 'published' and v.deleted_at is null
          union all
          select i.sort_order, i.created_at, jsonb_build_object(
                   'id', i.id, 'note', i.note, 'kind', 'event',
                   'event', jsonb_build_object('id', e.id, 'slug', e.slug, 'title', e.title, 'starts_at', e.starts_at, 'status', e.status,
                     'venue_name', coalesce((select vv.name from public.vendors vv where vv.id = e.venue_vendor_id), e.venue_name_freeform),
                     'is_free', e.is_free, 'price_from_ngn', e.price_from_ngn, 'price_to_ngn', e.price_to_ngn,
                     'lat', case when e.location is null then null else extensions.st_y(e.location::extensions.geometry) end,
                     'lng', case when e.location is null then null else extensions.st_x(e.location::extensions.geometry) end)) as item
            from public.list_items i join public.events e on e.id = i.event_id
           where i.list_id = l.id and e.status in ('published', 'cancelled') and e.deleted_at is null
        ) x
    ), '[]'::jsonb)
  )
    from public.lists l
    join public.profiles p on p.id = l.owner_id
    left join public.cities c on c.id = l.city_id
   where l.share_token = p_token and l.is_public and p.deleted_at is null;
$$;
revoke all on function public.get_shared_list(text) from public;
grant execute on function public.get_shared_list(text) to anon, authenticated, service_role;

-- View counter, called server-side (service role) behind a per-IP rate limit.
create or replace function public.admin_increment_list_view(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.lists set view_count = view_count + 1 where share_token = p_token and is_public;
$$;
revoke all on function public.admin_increment_list_view(text) from public, anon, authenticated;
grant execute on function public.admin_increment_list_view(text) to service_role;
