-- 0008 · §6.4 vendors
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  tagline text check (char_length(tagline) <= 160),
  description_md text check (char_length(description_md) <= 10000),
  category_id uuid not null references public.categories(id) on delete restrict,
  secondary_category_ids uuid[] not null default '{}',
  city_id uuid not null references public.cities(id) on delete restrict,
  area_id uuid references public.areas(id) on delete set null,
  address_line text,
  location extensions.geography(point, 4326) not null,
  phone text,
  whatsapp text,
  email text,
  website_url text,
  booking_url text,
  instagram_handle text,
  tiktok_handle text,
  x_handle text,
  cover_image_url text,
  logo_url text,
  gallery jsonb not null default '[]'::jsonb,
  opening_hours jsonb not null default '{}'::jsonb,
  price_band public.price_band,
  dress_code text,
  age_policy text,
  parking_note text,
  late_night_area_note text,
  features text[] not null default '{}',
  status public.vendor_status not null default 'draft',
  verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  claim_status public.claim_status not null default 'unclaimed',
  owner_profile_id uuid references public.profiles(id) on delete set null,
  is_seed boolean not null default false,
  points int not null default 0,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(tagline, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(address_line, '')), 'C') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(description_md, '')), 'D')
  ) stored,
  view_count int not null default 0,
  last_activity_at timestamptz,
  last_official_update_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(gallery) = 'array'),
  check (jsonb_typeof(opening_hours) = 'object')
);
create index vendors_location_gix on public.vendors using gist (location);
create index vendors_search_gin on public.vendors using gin (search_tsv);
create index vendors_name_trgm on public.vendors using gin (name extensions.gin_trgm_ops);
create index vendors_city_status_idx on public.vendors (city_id, status);
create index vendors_category_status_idx on public.vendors (category_id, status);
create index vendors_area_idx on public.vendors (area_id);
create index vendors_owner_idx on public.vendors (owner_profile_id);
alter table public.vendors enable row level security;
create trigger vendors_updated_at before update on public.vendors
  for each row execute function private.set_updated_at();
