-- 0019 · §6.20 point_events · §6.21 admin_tasks · §6.22 platform_settings
create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  kind text not null check (kind in (
    'checkin', 'checkin_at_venue', 'checkin_with_photo', 'pulse', 'official_update',
    'first_at_vendor', 'streak', 'admin_adjustment'
  )),
  points int not null,
  ref_entity_type text,
  ref_entity_id uuid,
  at timestamptz not null default now(),
  check (profile_id is not null or vendor_id is not null)
);
create index point_events_profile_idx on public.point_events (profile_id, at desc);
create index point_events_vendor_idx on public.point_events (vendor_id, at desc);
create index point_events_at_idx on public.point_events (at desc);
alter table public.point_events enable row level security;

create table public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  description text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'todo',
  due_at timestamptz,
  related_entity_type text,
  related_entity_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index admin_tasks_status_idx on public.admin_tasks (status, due_at);
alter table public.admin_tasks enable row level security;
create trigger admin_tasks_updated_at before update on public.admin_tasks
  for each row execute function private.set_updated_at();

create table public.platform_settings (
  id int primary key default 1 check (id = 1), -- single row
  listing_is_free boolean not null default true,
  monetisation_notice_md text,
  checkin_expiry_hours int not null default 12 check (checkin_expiry_hours between 1 and 72),
  max_posts_per_user_per_hour int not null default 6 check (max_posts_per_user_per_hour between 1 and 100),
  moderation_auto_block_threshold numeric not null default 0.85 check (moderation_auto_block_threshold between 0 and 1),
  moderation_auto_flag_threshold numeric not null default 0.5 check (moderation_auto_flag_threshold between 0 and 1),
  media_hold_trust_below int not null default 50 check (media_hold_trust_below between 0 and 100),
  media_hold_account_age_days int not null default 7 check (media_hold_account_age_days between 0 and 365),
  december_season_start date,
  december_season_end date,
  fx_gbp_per_ngn numeric,
  fx_usd_per_ngn numeric,
  maintenance_mode boolean not null default false,
  blocklist_phrases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (moderation_auto_flag_threshold <= moderation_auto_block_threshold),
  check (december_season_end is null or december_season_start is null or december_season_end > december_season_start)
);
alter table public.platform_settings enable row level security;
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function private.set_updated_at();
insert into public.platform_settings (id) values (1) on conflict (id) do nothing;
