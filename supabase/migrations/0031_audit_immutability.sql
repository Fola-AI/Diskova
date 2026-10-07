-- 0031 · §6.14 audit_log is append-only.
-- 1) No API role (including service_role) holds UPDATE / DELETE / TRUNCATE (or any) privilege.
-- 2) A trigger rejects UPDATE / DELETE / TRUNCATE for everyone else as well.
-- Inserts happen only through private.write_audit() (SECURITY DEFINER).
revoke all on private.audit_log from public, anon, authenticated, service_role;
revoke update, delete, truncate on private.audit_log from public, anon, authenticated, service_role;
revoke all on sequence private.audit_log_id_seq from public, anon, authenticated, service_role;

create or replace function private.audit_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only (% blocked)', tg_op using errcode = '42501';
end;
$$;

create trigger audit_log_no_update_delete
  before update or delete on private.audit_log
  for each row execute function private.audit_log_immutable();

create trigger audit_log_no_truncate
  before truncate on private.audit_log
  for each statement execute function private.audit_log_immutable();
