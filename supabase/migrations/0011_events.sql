-- 0011 · §6.13 events (created before posts because posts.event_id references it)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 140),
  description_md text check (char_length(description_md) <= 20000),
  vendor_id uuid references public.vendors(id) on delete set null,
  venue_vendor_id uuid references public.vendors(id) on delete set null,
  venue_name_freeform text,
  city_id uuid not null references public.cities(id) on delete restrict,
  area_id uuid references public.areas(id) on delete set null,
  location extensions.geography(point, 4326),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Africa/Lagos',
  cover_image_url text,
  category public.event_category not null default 'other',
  ticket_url text,
  price_from_ngn int check (price_from_ngn >= 0),
  price_to_ngn int check (price_to_ngn >= 0),
  is_free boolean not null default false,
  is_featured boolean not null default false,
  is_december_season boolean not null default false, -- set by trigger from platform_settings
  status public.event_status not null default 'pending_review',
  submitted_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  view_count int not null default 0,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(venue_name_freeform, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(description_md, '')), 'D')
  ) stored,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (price_to_ngn is null or price_from_ngn is null or price_to_ngn >= price_from_ngn)
);
create index events_city_starts_idx on public.events (city_id, status, starts_at);
create index events_season_idx on public.events (is_december_season, status, starts_at);
create index events_vendor_idx on public.events (vendor_id);
create index events_venue_idx on public.events (venue_vendor_id);
create index events_search_gin on public.events using gin (search_tsv);
create index events_title_trgm on public.events using gin (title extensions.gin_trgm_ops);
create index events_location_gix on public.events using gist (location);
alter table public.events enable row level security;
create trigger events_updated_at before update on public.events
  for each row execute function private.set_updated_at();
