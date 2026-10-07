-- 0054 · Stage P4 · itineraries + itinerary_items (§6.25 / PRD P4). Editorial content: written by staff
-- in the admin CMS (service role), read publicly once published.
create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 160),
  city_id uuid references public.cities(id) on delete set null,
  days smallint not null default 1 check (days between 1 and 14),
  excerpt text check (char_length(excerpt) <= 300),
  intro_md text not null default '',
  cover_image_url text,
  status public.guide_status not null default 'draft',
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index itineraries_status_idx on public.itineraries (status, published_at desc);
create index itineraries_city_idx on public.itineraries (city_id, status);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  day smallint not null check (day between 1 and 14),
  sort_order int not null default 0,
  time_label text check (char_length(time_label) <= 40),
  title text not null check (char_length(title) between 2 and 140),
  vendor_id uuid references public.vendors(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  description_md text check (char_length(description_md) <= 4000),
  cost_ngn int check (cost_ngn between 0 and 100000000), -- per person; null = no cost given
  cost_note text check (char_length(cost_note) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index itinerary_items_idx on public.itinerary_items (itinerary_id, day, sort_order);

create trigger itineraries_updated_at before update on public.itineraries for each row execute function private.set_updated_at();
create trigger itinerary_items_updated_at before update on public.itinerary_items for each row execute function private.set_updated_at();
create trigger audit_row_change after insert or update or delete on public.itineraries for each row execute function private.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.itinerary_items for each row execute function private.audit_row_change();

alter table public.itineraries enable row level security;
alter table public.itinerary_items enable row level security;
grant select on public.itineraries, public.itinerary_items to anon, authenticated;
grant all on public.itineraries, public.itinerary_items to service_role;
create policy itineraries_read on public.itineraries for select to anon, authenticated
  using ((status = 'published' and deleted_at is null) or (select public.has_staff_role('admin')));
create policy itinerary_items_read on public.itinerary_items for select to anon, authenticated
  using (exists (select 1 from public.itineraries i where i.id = itinerary_id
                  and ((i.status = 'published' and i.deleted_at is null) or (select public.has_staff_role('admin')))));
