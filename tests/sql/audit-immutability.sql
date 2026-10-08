-- audit_log is append-only for EVERY role, including service_role and the table owner (§6.14, L13).
-- Each attempt runs in a subtransaction; the whole script is rolled back.
begin;
do $$ begin perform private.write_audit('test.immutability', 'test', null, null, '{"x":1}'::jsonb, 'immutability probe', null, 'system'); end $$;

create temp table outcome (actor text, op text, result text) on commit drop;
grant insert on outcome to service_role;

-- 1) as the owner (postgres): the trigger must refuse UPDATE / DELETE / TRUNCATE
do $$
declare v_id bigint := (select max(id) from private.audit_log);
begin
  begin update private.audit_log set reason = 'tampered' where id = v_id; insert into outcome values ('postgres', 'update', 'ALLOWED');
  exception when others then insert into outcome values ('postgres', 'update', sqlstate); end;
  begin delete from private.audit_log where id = v_id; insert into outcome values ('postgres', 'delete', 'ALLOWED');
  exception when others then insert into outcome values ('postgres', 'delete', sqlstate); end;
  begin truncate private.audit_log; insert into outcome values ('postgres', 'truncate', 'ALLOWED');
  exception when others then insert into outcome values ('postgres', 'truncate', sqlstate); end;
end;
$$;

-- 2) as service_role: no privileges at all on private.audit_log
set local role service_role;
do $$
begin
  begin update private.audit_log set reason = 'tampered' where true; insert into outcome values ('service_role', 'update', 'ALLOWED');
  exception when others then insert into outcome values ('service_role', 'update', sqlstate); end;
  begin delete from private.audit_log where true; insert into outcome values ('service_role', 'delete', 'ALLOWED');
  exception when others then insert into outcome values ('service_role', 'delete', sqlstate); end;
  begin truncate private.audit_log; insert into outcome values ('service_role', 'truncate', 'ALLOWED');
  exception when others then insert into outcome values ('service_role', 'truncate', sqlstate); end;
end;
$$;
reset role;

select json_object_agg(actor || '.' || op, result) from outcome;
rollback;
