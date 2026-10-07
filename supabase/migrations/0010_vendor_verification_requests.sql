-- 0010 · §6.7 private.vendor_verification_requests
-- Docs (business_doc_path, id_doc_path) are purged 30 days after review (see private purge functions).
create table private.vendor_verification_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  business_doc_path text,
  id_doc_path text,
  social_proof_url text,
  note text,
  status public.verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  docs_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vvr_vendor_idx on private.vendor_verification_requests (vendor_id, created_at desc);
create index vvr_purge_idx on private.vendor_verification_requests (reviewed_at)
  where docs_purged_at is null and reviewed_at is not null;
alter table private.vendor_verification_requests enable row level security;
create trigger vvr_updated_at before update on private.vendor_verification_requests
  for each row execute function private.set_updated_at();
