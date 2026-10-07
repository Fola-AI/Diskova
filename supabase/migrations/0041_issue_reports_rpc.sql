-- 0041 · Private issue reports (§10, §6.19). The table lives in `private` and is never exposed; it is
-- written and read only through these service-role RPCs (called after server-side checks).
create or replace function public.admin_create_issue_report(
  p_category public.issue_category,
  p_description text,
  p_reporter_id uuid default null,
  p_reporter_email text default null,
  p_city_id uuid default null,
  p_area_id uuid default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into private.issue_reports (reporter_id, reporter_email, city_id, area_id, location, category, description)
  values (
    p_reporter_id,
    nullif(trim(p_reporter_email), '')::extensions.citext,
    p_city_id,
    p_area_id,
    case when p_lat is not null and p_lng is not null
      then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end,
    p_category,
    left(p_description, 4000)
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.admin_list_issue_reports(p_status public.issue_status default null, p_limit int default 100)
returns table (
  id uuid, created_at timestamptz, category public.issue_category, status public.issue_status, description text,
  city_name text, area_name text, reporter_username text, reporter_email text, has_location boolean,
  handled_by_username text, internal_note text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.created_at, r.category, r.status, r.description, c.name, a.name, p.username::text,
         r.reporter_email::text, r.location is not null, h.username::text, r.internal_note
    from private.issue_reports r
    left join public.cities c on c.id = r.city_id
    left join public.areas a on a.id = r.area_id
    left join public.profiles p on p.id = r.reporter_id
    left join public.profiles h on h.id = r.handled_by
   where p_status is null or r.status = p_status
   order by case r.status when 'new' then 0 when 'escalated' then 1 when 'triaged' then 2 else 3 end, r.created_at desc
   limit least(greatest(p_limit, 1), 500);
$$;

create or replace function public.admin_update_issue_report(p_id uuid, p_status public.issue_status, p_handled_by uuid, p_internal_note text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.issue_reports
     set status = p_status, handled_by = p_handled_by,
         internal_note = coalesce(nullif(trim(p_internal_note), ''), internal_note)
   where id = p_id;
$$;

revoke all on function public.admin_create_issue_report(public.issue_category, text, uuid, text, uuid, uuid, double precision, double precision) from public, anon, authenticated;
revoke all on function public.admin_list_issue_reports(public.issue_status, int) from public, anon, authenticated;
revoke all on function public.admin_update_issue_report(uuid, public.issue_status, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_create_issue_report(public.issue_category, text, uuid, text, uuid, uuid, double precision, double precision) to service_role;
grant execute on function public.admin_list_issue_reports(public.issue_status, int) to service_role;
grant execute on function public.admin_update_issue_report(uuid, public.issue_status, uuid, text) to service_role;
