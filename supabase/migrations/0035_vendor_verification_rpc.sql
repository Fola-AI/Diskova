-- 0035 · Vendor verification + claim requests (private.vendor_verification_requests, §6.7, §8.9).
-- A request from someone who is NOT a member of an unclaimed vendor is a *claim* request.

-- Service role: create a request (Server Action has already checked the caller).
create or replace function public.admin_create_verification_request(
  p_vendor_id uuid,
  p_submitted_by uuid,
  p_business_doc_path text default null,
  p_id_doc_path text default null,
  p_social_proof_url text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if exists (
    select 1 from private.vendor_verification_requests r
     where r.vendor_id = p_vendor_id and r.submitted_by = p_submitted_by and r.status = 'pending'
  ) then
    raise exception 'A request for this venue is already pending' using errcode = 'P0001';
  end if;
  insert into private.vendor_verification_requests
    (vendor_id, submitted_by, business_doc_path, id_doc_path, social_proof_url, note)
  values (p_vendor_id, p_submitted_by, p_business_doc_path, p_id_doc_path, left(p_social_proof_url, 500), left(p_note, 2000))
  returning id into v_id;
  return v_id;
end;
$$;

-- Service role: list requests for the admin queue.
create or replace function public.admin_list_verification_requests(p_status public.verification_status default 'pending')
returns table (
  id uuid,
  vendor_id uuid,
  vendor_name text,
  vendor_slug text,
  vendor_claim_status public.claim_status,
  submitted_by uuid,
  submitter_username text,
  is_claim boolean,
  business_doc_path text,
  id_doc_path text,
  social_proof_url text,
  note text,
  status public.verification_status,
  created_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text,
  docs_purged_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.vendor_id, v.name, v.slug, v.claim_status, r.submitted_by, p.username::text,
         not exists (select 1 from public.vendor_members m where m.vendor_id = r.vendor_id and m.profile_id = r.submitted_by),
         r.business_doc_path, r.id_doc_path, r.social_proof_url, r.note, r.status, r.created_at,
         r.reviewed_at, r.rejection_reason, r.docs_purged_at
    from private.vendor_verification_requests r
    join public.vendors v on v.id = r.vendor_id
    left join public.profiles p on p.id = r.submitted_by
   where r.status = p_status
   order by r.created_at;
$$;

-- Service role: record a decision. Returns the request so the service can act on claims.
create or replace function public.admin_decide_verification_request(
  p_id uuid,
  p_status public.verification_status,
  p_reviewer uuid,
  p_reason text default null
)
returns table (vendor_id uuid, submitted_by uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;
  return query
  update private.vendor_verification_requests r
     set status = p_status, reviewed_by = p_reviewer, reviewed_at = now(),
         rejection_reason = case when p_status = 'rejected' then left(p_reason, 1000) end
   where r.id = p_id and r.status = 'pending'
  returning r.vendor_id, r.submitted_by;
end;
$$;

-- Vendor members (and claimants) see the status of their own requests — never other people's, never doc paths.
create or replace function public.my_verification_requests(p_vendor_id uuid)
returns table (id uuid, status public.verification_status, created_at timestamptz, reviewed_at timestamptz, rejection_reason text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.status, r.created_at, r.reviewed_at, r.rejection_reason
    from private.vendor_verification_requests r
   where r.vendor_id = p_vendor_id
     and r.submitted_by = (select auth.uid())
   order by r.created_at desc
   limit 10;
$$;

revoke all on function public.admin_create_verification_request(uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_list_verification_requests(public.verification_status) from public, anon, authenticated;
revoke all on function public.admin_decide_verification_request(uuid, public.verification_status, uuid, text) from public, anon, authenticated;
revoke all on function public.my_verification_requests(uuid) from public;
grant execute on function public.admin_create_verification_request(uuid, uuid, text, text, text, text) to service_role;
grant execute on function public.admin_list_verification_requests(public.verification_status) to service_role;
grant execute on function public.admin_decide_verification_request(uuid, public.verification_status, uuid, text) to service_role;
grant execute on function public.my_verification_requests(uuid) to authenticated;
