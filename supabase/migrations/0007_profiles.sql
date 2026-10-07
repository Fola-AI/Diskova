-- 0007 · §6.8 profiles (+ private.profile_meta)
-- Created before vendors because vendors.owner_profile_id references it.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext not null unique
    check (username::text ~ '^[A-Za-z0-9_]{3,30}$'),
  display_name text check (char_length(display_name) <= 60),
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  home_city_id uuid references public.cities(id) on delete set null,
  is_diaspora boolean,
  role public.user_role not null default 'user',
  email_verified_at timestamptz,
  status public.profile_status not null default 'active',
  status_reason text,
  status_until timestamptz,
  is_shadowbanned boolean not null default false, -- denormalised from user_sanctions by trigger
  trust_score int not null default 50 check (trust_score between 0 and 100),
  points int not null default 0,
  post_count int not null default 0,
  badges text[] not null default '{}',
  location_consent boolean not null default false,
  last_seen_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role <> 'user';
create index profiles_shadowbanned_idx on public.profiles (id) where is_shadowbanned;
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Sensitive, admin-read-only. Informational only — never used for automatic sanctions (§7.10).
create table private.profile_meta (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  signup_ip inet,
  last_ip inet,
  signup_ua text,
  device_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table private.profile_meta enable row level security;
create trigger profile_meta_updated_at before update on private.profile_meta
  for each row execute function private.set_updated_at();
