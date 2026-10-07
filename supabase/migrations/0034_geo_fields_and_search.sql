-- 0034 · Read helpers for the directory (Stage L4). No table changes.

-- PostgREST computed fields: select=lat,lng on vendors / cities / areas / events.
create or replace function public.lat(r public.vendors) returns double precision
language sql immutable set search_path = '' as $$ select extensions.st_y(r.location::extensions.geometry) $$;
create or replace function public.lng(r public.vendors) returns double precision
language sql immutable set search_path = '' as $$ select extensions.st_x(r.location::extensions.geometry) $$;
create or replace function public.lat(r public.cities) returns double precision
language sql immutable set search_path = '' as $$ select extensions.st_y(r.centroid::extensions.geometry) $$;
create or replace function public.lng(r public.cities) returns double precision
language sql immutable set search_path = '' as $$ select extensions.st_x(r.centroid::extensions.geometry) $$;
create or replace function public.lat(r public.areas) returns double precision
language sql immutable set search_path = '' as $$ select extensions.st_y(r.centroid::extensions.geometry) $$;
create or replace function public.lng(r public.areas) returns double precision
language sql immutable set search_path = '' as $$ select extensions.st_x(r.centroid::extensions.geometry) $$;
create or replace function public.lat(r public.events) returns double precision
language sql immutable set search_path = '' as $$ select extensions.st_y(r.location::extensions.geometry) $$;
create or replace function public.lng(r public.events) returns double precision
language sql immutable set search_path = '' as $$ select extensions.st_x(r.location::extensions.geometry) $$;

do $$
declare t text;
begin
  foreach t in array array['vendors', 'cities', 'areas', 'events'] loop
    execute format('revoke all on function public.lat(public.%I) from public', t);
    execute format('revoke all on function public.lng(public.%I) from public', t);
    execute format('grant execute on function public.lat(public.%I) to anon, authenticated, service_role', t);
    execute format('grant execute on function public.lng(public.%I) to anon, authenticated, service_role', t);
  end loop;
end;
$$;

-- §8.8 search: Postgres FTS (search_tsv) + trigram / substring matching for typeahead, across
-- published vendors, upcoming events and published guides. SECURITY INVOKER: RLS still applies.
create or replace function public.search_directory(
  p_q text,
  p_city_id uuid default null,
  p_limit int default 20
)
returns table (kind text, id uuid, slug text, title text, subtitle text, city_id uuid, score real)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('simple'::regconfig, p_q) as tsq,
           lower(trim(p_q)) as raw,
           '%' || replace(replace(replace(lower(trim(p_q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  hits as (
    select 'vendor'::text as kind, v.id, v.slug, v.name as title,
           coalesce(v.tagline, '') as subtitle, v.city_id,
           (ts_rank(v.search_tsv, q.tsq) * 2
             + extensions.word_similarity(q.raw, lower(v.name))
             + case when lower(v.name) like q.raw || '%' then 0.5 else 0 end)::real as score
      from public.vendors v, q
     where v.status = 'published' and v.deleted_at is null
       and (p_city_id is null or v.city_id = p_city_id)
       and (v.search_tsv @@ q.tsq
            or lower(v.name) like q.pattern
            or extensions.word_similarity(q.raw, lower(v.name)) > 0.45)
    union all
    select 'event', e.id, e.slug, e.title, coalesce(e.venue_name_freeform, ''), e.city_id,
           (ts_rank(e.search_tsv, q.tsq) * 2 + extensions.word_similarity(q.raw, lower(e.title)))::real
      from public.events e, q
     where e.status = 'published' and e.deleted_at is null
       and coalesce(e.ends_at, e.starts_at) >= now() - interval '1 day'
       and (p_city_id is null or e.city_id = p_city_id)
       and (e.search_tsv @@ q.tsq
            or lower(e.title) like q.pattern
            or extensions.word_similarity(q.raw, lower(e.title)) > 0.45)
    union all
    select 'guide', g.id, g.slug, g.title, coalesce(g.excerpt, ''), g.city_id,
           (ts_rank(g.search_tsv, q.tsq) * 1.5 + extensions.word_similarity(q.raw, lower(g.title)))::real
      from public.guides g, q
     where g.status = 'published' and g.deleted_at is null
       and (p_city_id is null or g.city_id is null or g.city_id = p_city_id)
       and (g.search_tsv @@ q.tsq
            or lower(g.title) like q.pattern
            or extensions.word_similarity(q.raw, lower(g.title)) > 0.45)
  )
  select h.kind, h.id, h.slug, h.title, h.subtitle, h.city_id, h.score
    from hits h
   where length(trim(p_q)) >= 2
   order by h.score desc, h.title
   limit least(greatest(p_limit, 1), 50);
$$;
revoke all on function public.search_directory(text, uuid, int) from public;
grant execute on function public.search_directory(text, uuid, int) to anon, authenticated, service_role;
