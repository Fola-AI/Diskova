-- 0006 · §6.3 categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  name text not null,
  "group" public.category_group not null,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create trigger categories_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
