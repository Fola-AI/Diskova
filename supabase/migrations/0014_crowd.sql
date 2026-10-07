-- 0014 · §6.11 crowd_snapshots · §6.12 crowd_forecast (written by pg_cron only)
create table public.crowd_snapshots (
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  bucket_start timestamptz not null,
  crowd_level_avg numeric(4,2) not null,
  crowd_level_mode smallint,
  vibe_avg numeric(4,2),
  post_count int not null default 0,
  official_count int not null default 0,
  at_venue_count int not null default 0,
  confidence public.crowd_confidence not null,
  primary key (vendor_id, bucket_start)
);
create index crowd_snapshots_bucket_idx on public.crowd_snapshots (bucket_start desc);
alter table public.crowd_snapshots enable row level security;

create table public.crowd_forecast (
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday (Africa/Lagos)
  hour smallint not null check (hour between 0 and 23),
  crowd_level_expected numeric(4,2) not null,
  sample_size int not null default 0,
  primary key (vendor_id, weekday, hour)
);
alter table public.crowd_forecast enable row level security;
