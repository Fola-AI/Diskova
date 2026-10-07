-- 0016 · §6.15 reports · §6.16 moderation_items · §6.17 user_sanctions
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  entity_type public.report_entity not null,
  entity_id uuid not null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporter_id, entity_type, entity_id)
);
create index reports_entity_idx on public.reports (entity_type, entity_id);
create index reports_status_idx on public.reports (status, created_at);
alter table public.reports enable row level security;
create trigger reports_updated_at before update on public.reports
  for each row execute function private.set_updated_at();

create table public.moderation_items (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('post', 'vendor', 'event', 'profile', 'guide', 'qa_question', 'qa_answer')),
  entity_id uuid not null,
  priority smallint not null default 3 check (priority between 1 and 5), -- 1 high … 5 low
  source public.moderation_source not null,
  status public.moderation_status not null default 'open',
  assigned_to uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- At most one open item per entity per source (triggers use ON CONFLICT DO NOTHING).
create unique index moderation_items_open_uniq on public.moderation_items (entity_type, entity_id, source)
  where status <> 'done';
create index moderation_items_queue_idx on public.moderation_items (status, priority, opened_at);
alter table public.moderation_items enable row level security;
create trigger moderation_items_updated_at before update on public.moderation_items
  for each row execute function private.set_updated_at();

create table public.user_sanctions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind public.sanction_kind not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  lifted_by uuid references public.profiles(id) on delete set null,
  lifted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_sanctions_active_idx on public.user_sanctions (profile_id, kind) where lifted_at is null;
create index user_sanctions_expiry_idx on public.user_sanctions (expires_at) where lifted_at is null and expires_at is not null;
alter table public.user_sanctions enable row level security;
create trigger user_sanctions_updated_at before update on public.user_sanctions
  for each row execute function private.set_updated_at();
