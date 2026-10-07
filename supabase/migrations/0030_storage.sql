-- 0030 · Storage buckets + policies (§2, §7.6)
-- media-incoming   private  raw uploads via signed upload URLs; processed then deleted (24 h purge)
-- media            public   processed, EXIF-stripped WebP (post photos, avatars under avatars/{uid}/)
-- vendor-assets    public   processed vendor cover/logo/gallery
-- verification-docs private business + ID documents; 10-min signed read URLs, admin only; purged 30 d after decision
-- guides           public   CMS images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media-incoming', 'media-incoming', false, 5242880,
     array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('vendor-assets', 'vendor-assets', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('verification-docs', 'verification-docs', false, 10485760,
     array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('guides', 'guides', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies: deliberately NONE for anon/authenticated on storage.objects (RLS is on, so default deny).
--  * Uploads use server-issued signed upload URLs (the Server Action checks role, quota, mime, size).
--  * Public buckets are read through public object URLs, which don't consult RLS; listing stays denied.
--  * Processing, moves and deletes happen server-side with the service role, one image per call.
--  * verification-docs are read only through 10-minute signed URLs minted for admins.
-- Remove any permissive policies a dashboard click might have added on these buckets.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and (qual ilike any (array['%media-incoming%', '%verification-docs%', '%''media''%', '%vendor-assets%', '%''guides''%'])
         or with_check ilike any (array['%media-incoming%', '%verification-docs%', '%''media''%', '%vendor-assets%', '%''guides''%']))
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end;
$$;
