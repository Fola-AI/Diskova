-- RLS matrix probe (Stage L13). Runs in ONE transaction that is always rolled back.
-- For every public table/view and every role, records: SELECT row count, rows a no-op UPDATE
-- touches, rows a DELETE touches (each write in a subtransaction that is forced to roll back),
-- or the SQLSTATE when the statement is refused. Output: one JSON document on stdout.
begin;

create temp table matrix (role text, rel text, op text, result text) on commit drop;
grant insert, select on matrix to anon, authenticated;

create temp table fixtures (label text primary key, uid uuid, aal text) on commit drop;
grant select on fixtures to anon, authenticated;

do $$
declare
  v_label text;
  v_role public.user_role;
  v_uid uuid;
  v_vendor uuid;
begin
  foreach v_label in array array['user', 'vendor_owner', 'moderator', 'admin', 'super_admin'] loop
    v_uid := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'matrix-' || v_label || '-' || substr(v_uid::text, 1, 8) || '@example.com', now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now());
    v_role := case v_label when 'user' then 'user' when 'vendor_owner' then 'vendor_member' else v_label end::public.user_role;
    update public.profiles set role = v_role, email_verified_at = coalesce(email_verified_at, now()) where id = v_uid;
    insert into fixtures values (v_label, v_uid, 'aal1');
    if v_label in ('moderator', 'admin', 'super_admin') then
      insert into fixtures values (v_label || '_aal2', v_uid, 'aal2');
    end if;
    if v_label = 'vendor_owner' then
      insert into public.vendors (slug, name, category_id, city_id, location, status, owner_profile_id)
      select 'matrix-' || substr(v_uid::text, 1, 8), 'Matrix Vendor', (select id from public.categories limit 1),
             (select id from public.cities where slug = 'lagos'), 'SRID=4326;POINT(3.42 6.43)', 'draft', v_uid
      returning id into v_vendor;
      insert into public.vendor_members (vendor_id, profile_id, role, accepted_at)
      values (v_vendor, v_uid, 'owner', now()) on conflict do nothing;
      insert into public.vendor_prices (vendor_id, label, amount_ngn) values (v_vendor, 'Matrix price', 1000);
    end if;
  end loop;
  insert into fixtures values ('anon', null, null);
end;
$$;

do $$
declare
  f record;
  t record;
  v_n bigint;
  v_col text;
  v_res text;
begin
  for f in select * from fixtures order by label loop
    -- Impersonate exactly as PostgREST does: role + JWT claims (sub, role, aal).
    if f.uid is null then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      perform set_config('request.jwt.claim.sub', '', true);
      perform set_config('role', 'anon', true);
    else
      perform set_config('request.jwt.claims', json_build_object('sub', f.uid, 'role', 'authenticated', 'aal', f.aal)::text, true);
      perform set_config('request.jwt.claim.sub', f.uid::text, true);
      perform set_config('role', 'authenticated', true);
    end if;

    for t in
      select c.oid, c.relname, c.relkind
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') and not c.relispartition
       order by c.relname
    loop
      -- SELECT
      begin
        execute format('select count(*) from public.%I', t.relname) into v_n;
        v_res := v_n::text;
      exception when others then
        v_res := 'denied:' || sqlstate;
      end;
      insert into matrix values (f.label, t.relname, 'select', v_res);

      continue when t.relkind in ('v', 'm');

      -- UPDATE (no-op on the first column this role may update)
      select a.attname into v_col
        from pg_attribute a
       where a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
         and has_column_privilege(t.oid, a.attnum, 'UPDATE')
       order by a.attnum limit 1;
      if v_col is null then
        v_res := 'no_grant';
      else
        begin
          execute format('update public.%I set %I = %I where true', t.relname, v_col, v_col);
          get diagnostics v_n = row_count;
          raise exception using errcode = 'P0099', message = v_n::text;
        exception
          when sqlstate 'P0099' then v_res := sqlerrm;
          when others then v_res := 'denied:' || sqlstate;
        end;
      end if;
      insert into matrix values (f.label, t.relname, 'update', v_res);

      -- DELETE
      if not has_table_privilege(t.oid, 'DELETE') then
        v_res := 'no_grant';
      else
        begin
          execute format('delete from public.%I where true', t.relname);
          get diagnostics v_n = row_count;
          raise exception using errcode = 'P0099', message = v_n::text;
        exception
          when sqlstate 'P0099' then v_res := sqlerrm;
          when others then v_res := 'denied:' || sqlstate;
        end;
      end if;
      insert into matrix values (f.label, t.relname, 'delete', v_res);
    end loop;

    perform set_config('role', 'postgres', true);
  end loop;
end;
$$;

reset role;
-- Baseline: true row counts (as the table owner), so tests can compare what each role sees.
do $$
declare t record; v_n bigint;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm') and not c.relispartition loop
    execute format('select count(*) from public.%I', t.relname) into v_n;
    insert into matrix values ('postgres', t.relname, 'select', v_n::text);
  end loop;
end;
$$;
select json_object_agg(role, rels) from (
  select role, json_object_agg(rel, ops) as rels from (
    select role, rel, json_object_agg(op, result) as ops from matrix group by role, rel
  ) x group by role
) y;

rollback;
