-- 0018 · §6.19 safety_info (public, information only) + private.issue_reports (never public)
create table public.safety_info (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references public.cities(id) on delete cascade, -- null = national
  section public.safety_section not null,
  title text not null,
  body_md text not null default '',
  sort_order int not null default 0,
  last_verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index safety_info_city_idx on public.safety_info (city_id, section, sort_order);
alter table public.safety_info enable row level security;
create trigger safety_info_updated_at before update on public.safety_info
  for each row execute function private.set_updated_at();

create table private.issue_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_email extensions.citext,
  city_id uuid references public.cities(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  location extensions.geography(point, 4326),
  category public.issue_category not null,
  description text not null check (char_length(description) between 10 and 4000),
  status public.issue_status not null default 'new',
  handled_by uuid references public.profiles(id) on delete set null,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index issue_reports_status_idx on private.issue_reports (status, created_at desc);
alter table private.issue_reports enable row level security;
create trigger issue_reports_updated_at before update on private.issue_reports
  for each row execute function private.set_updated_at();
