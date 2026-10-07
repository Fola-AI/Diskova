-- 0012 · §6.9 posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  kind public.post_kind not null,
  body text check (char_length(body) <= 500),
  crowd_level smallint check (crowd_level between 1 and 5),
  vibe smallint check (vibe between 1 and 5),
  wait_minutes int check (wait_minutes between 0 and 600),
  cover_fee_ngn int check (cover_fee_ngn >= 0),
  location extensions.geography(point, 4326),
  distance_from_venue_m int,
  is_at_venue boolean not null default false, -- soft signal only (distance < 300 m), never a gate
  status public.post_status not null default 'pending',
  hold_reason public.hold_reason not null default 'none',
  verified boolean not null default false,
  moderation_score jsonb,
  moderation_decision public.moderation_decision,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  report_count int not null default 0,
  like_count int not null default 0,
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- crowd level is required for checkin / pulse / official
  constraint posts_crowd_required check (kind = 'update' or crowd_level is not null),
  -- pulse is crowd level only: no text
  constraint posts_pulse_no_body check (kind <> 'pulse' or body is null)
);
create index posts_vendor_feed_idx on public.posts (vendor_id, status, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_status_hold_idx on public.posts (status, hold_reason);
create index posts_location_gix on public.posts using gist (location);
create index posts_recent_published_idx on public.posts (created_at desc)
  where status = 'published' and deleted_at is null;
alter table public.posts enable row level security;
create trigger posts_updated_at before update on public.posts
  for each row execute function private.set_updated_at();
