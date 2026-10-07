-- 0013 · §6.10 post_media (rows written only by the media pipeline, one image per invocation)
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  kind public.media_kind not null default 'image',
  width int,
  height int,
  duration_s numeric,
  blurhash text,
  phash text,
  moderation_score jsonb,
  sort_order smallint not null default 0,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index post_media_post_idx on public.post_media (post_id, sort_order);
create index post_media_phash_idx on public.post_media (phash) where phash is not null;
alter table public.post_media enable row level security;
create trigger post_media_updated_at before update on public.post_media
  for each row execute function private.set_updated_at();
