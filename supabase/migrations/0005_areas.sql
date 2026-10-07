-- 0005 · §6.2 areas
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  centroid extensions.geography(point, 4326),
  polygon extensions.geography(polygon, 4326),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug)
);
create index areas_city_idx on public.areas (city_id, sort_order);
alter table public.areas enable row level security;
create trigger areas_updated_at before update on public.areas
  for each row execute function private.set_updated_at();
