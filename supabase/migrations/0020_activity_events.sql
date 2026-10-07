-- 0020 · §6.23 activity_events — pg_partman is available on DEV (5.3.1), so monthly native range
-- partitions with 13-month retention (no BRIN fallback needed).
create table public.activity_events (
  id bigint generated always as identity,
  at timestamptz not null default now(),
  kind text not null,
  city_id uuid,
  vendor_id uuid,
  profile_id uuid,
  meta jsonb not null default '{}'::jsonb,
  primary key (id, at)
) partition by range (at);
create index activity_events_at_idx on public.activity_events (at desc);
create index activity_events_kind_idx on public.activity_events (kind, at desc);
create index activity_events_vendor_idx on public.activity_events (vendor_id, at desc) where vendor_id is not null;
create index activity_events_city_idx on public.activity_events (city_id, at desc) where city_id is not null;
alter table public.activity_events enable row level security;

select extensions.create_parent(
  p_parent_table := 'public.activity_events',
  p_control := 'at',
  p_interval := '1 month',
  p_premake := 3
);
update extensions.part_config
   set retention = '13 months',
       retention_keep_table = false,
       infinite_time_partitions = true
 where parent_table = 'public.activity_events';
