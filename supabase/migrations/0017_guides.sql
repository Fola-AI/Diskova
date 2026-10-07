-- 0017 · §6.18 guides + guide_revisions
create table public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  type public.guide_type not null,
  city_id uuid references public.cities(id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  excerpt text check (char_length(excerpt) <= 400),
  body_md text not null default '',
  cover_image_url text,
  author_profile_id uuid references public.profiles(id) on delete set null,
  tags text[] not null default '{}',
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  status public.guide_status not null default 'draft',
  published_at timestamptz,
  updated_by uuid references public.profiles(id) on delete set null,
  view_count int not null default 0,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(body_md, '')), 'D')
  ) stored,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guides_type_status_idx on public.guides (type, status, published_at desc);
create index guides_city_idx on public.guides (city_id, status);
create index guides_search_gin on public.guides using gin (search_tsv);
create index guides_title_trgm on public.guides using gin (title extensions.gin_trgm_ops);
alter table public.guides enable row level security;
create trigger guides_updated_at before update on public.guides
  for each row execute function private.set_updated_at();

create table public.guide_revisions (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references public.guides(id) on delete cascade,
  body_md text not null,
  saved_by uuid references public.profiles(id) on delete set null,
  saved_at timestamptz not null default now()
);
create index guide_revisions_guide_idx on public.guide_revisions (guide_id, saved_at desc);
alter table public.guide_revisions enable row level security;
