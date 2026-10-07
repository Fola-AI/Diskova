-- 0022 · auth.users → profiles (§6.8)

-- Create a profile (with a generated unique username) and an empty private.profile_meta row.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_candidate text;
  v_attempt int := 0;
begin
  v_base := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  if length(v_base) < 3 then
    v_base := 'user' || v_base;
  end if;
  v_base := left(v_base, 20);
  v_candidate := v_base;

  while exists (select 1 from public.profiles p where p.username = v_candidate::extensions.citext) loop
    v_attempt := v_attempt + 1;
    v_candidate := v_base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 4 + (v_attempt / 5));
  end loop;

  insert into public.profiles (id, username, display_name, email_verified_at)
  values (
    new.id,
    v_candidate,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60), ''),
    new.email_confirmed_at
  );
  insert into private.profile_meta (profile_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep profiles.email_verified_at in sync with auth email confirmation.
create or replace function private.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email_verified_at = new.email_confirmed_at
   where id = new.id
     and email_verified_at is distinct from new.email_confirmed_at;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function private.handle_user_email_confirmed();
