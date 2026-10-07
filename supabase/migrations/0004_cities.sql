-- 0004 · §6.1 cities
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  state text not null,
  country text not null default 'NG',
  centroid extensions.geography(point, 4326),
  bbox extensions.geography(polygon, 4326),
  timezone text not null default 'Africa/Lagos',
  hero_image_url text,
  intro_md text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cities enable row level security;
create trigger cities_updated_at before update on public.cities
  for each row execute function private.set_updated_at();
