-- 0009 · §6.5 vendor_members · §6.6 vendor_prices
create table public.vendor_members (
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.vendor_member_role not null default 'staff',
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (vendor_id, profile_id)
);
create index vendor_members_profile_idx on public.vendor_members (profile_id);
alter table public.vendor_members enable row level security;
create trigger vendor_members_updated_at before update on public.vendor_members
  for each row execute function private.set_updated_at();

create table public.vendor_prices (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  amount_ngn int not null check (amount_ngn >= 0),
  note text check (char_length(note) <= 200),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from)
);
create index vendor_prices_vendor_idx on public.vendor_prices (vendor_id, is_active);
alter table public.vendor_prices enable row level security;
create trigger vendor_prices_updated_at before update on public.vendor_prices
  for each row execute function private.set_updated_at();
