-- 0052 · Stage P3 · Community Q&A (§6.25 / PRD P3): qa_questions, qa_answers, qa_votes.
-- Text is moderated like posts: rows start 'pending' and the server publishes / hides them after the
-- moderation decision (service role). Pinned "seed" questions and official answers are staff-created.
create table public.qa_questions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 10 and 140),
  body text check (char_length(body) <= 1000),
  status public.post_status not null default 'pending',
  moderation_decision public.moderation_decision,
  moderation_score jsonb,
  is_pinned boolean not null default false,
  accepted_answer_id uuid,
  answer_count int not null default 0,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index qa_questions_vendor_idx on public.qa_questions (vendor_id, is_pinned desc, created_at desc) where deleted_at is null;
create index qa_questions_city_idx on public.qa_questions (city_id, is_pinned desc, created_at desc) where deleted_at is null;
create index qa_questions_status_idx on public.qa_questions (status, created_at desc);

create table public.qa_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.qa_questions(id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 2 and 1000),
  status public.post_status not null default 'pending',
  moderation_decision public.moderation_decision,
  moderation_score jsonb,
  is_vendor_answer boolean not null default false, -- set by trigger: author is an accepted member of the venue
  is_official boolean not null default false,      -- staff answers (pinned seeds); service role only
  vote_count int not null default 0,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index qa_answers_question_idx on public.qa_answers (question_id, vote_count desc, created_at);
create index qa_answers_status_idx on public.qa_answers (status, created_at desc);
alter table public.qa_questions add constraint qa_questions_accepted_fk foreign key (accepted_answer_id) references public.qa_answers(id) on delete set null;

create table public.qa_votes (
  answer_id uuid not null references public.qa_answers(id) on delete cascade,
  voter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, voter_id)
);

create trigger qa_questions_updated_at before update on public.qa_questions for each row execute function private.set_updated_at();
create trigger qa_answers_updated_at before update on public.qa_answers for each row execute function private.set_updated_at();

-- ---------- integrity triggers ----------
create or replace function private.qa_questions_before()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vendor_id is not null then
    select v.city_id into new.city_id from public.vendors v where v.id = new.vendor_id;
  end if;
  if tg_op = 'UPDATE' and new.accepted_answer_id is distinct from old.accepted_answer_id and new.accepted_answer_id is not null then
    if not exists (select 1 from public.qa_answers a where a.id = new.accepted_answer_id and a.question_id = new.id and a.status = 'published' and a.deleted_at is null) then
      raise exception 'That answer does not belong to this question.' using errcode = '22023';
    end if;
  end if;
  -- API callers can't pin, publish, or change who asked.
  if private.is_api_caller() then
    if tg_op = 'INSERT' then
      new.is_pinned := false; new.status := 'pending'; new.moderation_decision := null; new.moderation_score := null;
    else
      new.is_pinned := old.is_pinned; new.status := old.status; new.author_id := old.author_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger qa_questions_before before insert or update on public.qa_questions for each row execute function private.qa_questions_before();

create or replace function private.qa_answers_before()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_vendor uuid;
begin
  if tg_op = 'INSERT' then
    select q.vendor_id into v_vendor from public.qa_questions q where q.id = new.question_id;
    new.is_vendor_answer := v_vendor is not null and exists (
      select 1 from public.vendor_members m where m.vendor_id = v_vendor and m.profile_id = new.author_id and m.accepted_at is not null);
    if private.is_api_caller() then
      new.is_official := false; new.status := 'pending'; new.moderation_decision := null; new.moderation_score := null;
    end if;
  elsif private.is_api_caller() then
    new.status := old.status; new.is_official := old.is_official; new.is_vendor_answer := old.is_vendor_answer; new.author_id := old.author_id;
  end if;
  return new;
end;
$$;
create trigger qa_answers_before before insert or update on public.qa_answers for each row execute function private.qa_answers_before();

-- Counters: answers per question (published, not deleted) and votes per answer.
create or replace function private.qa_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_q uuid := coalesce(new.question_id, old.question_id);
begin
  update public.qa_questions q set answer_count = (
    select count(*) from public.qa_answers a where a.question_id = v_q and a.status = 'published' and a.deleted_at is null)
   where q.id = v_q;
  return null;
end;
$$;
create trigger qa_answers_count after insert or delete or update of status, deleted_at on public.qa_answers
  for each row execute function private.qa_counters();

create or replace function private.qa_vote_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_a uuid := coalesce(new.answer_id, old.answer_id);
begin
  update public.qa_answers set vote_count = (select count(*) from public.qa_votes v where v.answer_id = v_a) where id = v_a;
  return null;
end;
$$;
create trigger qa_votes_count after insert or delete on public.qa_votes for each row execute function private.qa_vote_counter();

-- Reports on Q&A: count, and auto-hide at 3 open reports (the generic report trigger queues them).
create or replace function private.qa_reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_count int;
begin
  if new.entity_type::text not in ('qa_question', 'qa_answer') then
    return null;
  end if;
  select count(*) into v_count from public.reports r where r.entity_type = new.entity_type and r.entity_id = new.entity_id and r.status in ('open', 'reviewing');
  if new.entity_type::text = 'qa_question' then
    update public.qa_questions set report_count = report_count + 1, status = case when v_count >= 3 and status = 'published' then 'hidden' else status end where id = new.entity_id;
  else
    update public.qa_answers set report_count = report_count + 1, status = case when v_count >= 3 and status = 'published' then 'hidden' else status end where id = new.entity_id;
  end if;
  if v_count >= 3 then
    update public.moderation_items set priority = 1 where entity_type = new.entity_type::text and entity_id = new.entity_id and status <> 'done';
  end if;
  return null;
end;
$$;
create trigger reports_after_insert_qa after insert on public.reports for each row execute function private.qa_reports_after_insert();

do $$
declare t text;
begin
  foreach t in array array['public.qa_questions', 'public.qa_answers', 'public.qa_votes'] loop
    execute format('create trigger audit_row_change after insert or update or delete on %s for each row execute function private.audit_row_change()', t);
  end loop;
end;
$$;

-- ---------- RLS ----------
alter table public.qa_questions enable row level security;
alter table public.qa_answers enable row level security;
alter table public.qa_votes enable row level security;

grant select (id, vendor_id, city_id, author_id, title, body, status, is_pinned, accepted_answer_id, answer_count, created_at, updated_at, deleted_at)
  on public.qa_questions to anon, authenticated;
grant insert (vendor_id, city_id, title, body) on public.qa_questions to authenticated;
grant update (accepted_answer_id, deleted_at) on public.qa_questions to authenticated;
create policy qa_questions_read on public.qa_questions for select to anon, authenticated
  using ((status = 'published' and deleted_at is null and public.author_is_visible(author_id))
         or (author_id = (select auth.uid()) and deleted_at is null)
         or (select public.has_staff_role('moderator')));
create policy qa_questions_insert on public.qa_questions for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_verified_user()));
create policy qa_questions_update_own on public.qa_questions for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

grant select (id, question_id, author_id, body, status, is_vendor_answer, is_official, vote_count, created_at, updated_at, deleted_at)
  on public.qa_answers to anon, authenticated;
grant insert (question_id, body) on public.qa_answers to authenticated;
grant update (deleted_at) on public.qa_answers to authenticated;
create policy qa_answers_read on public.qa_answers for select to anon, authenticated
  using ((status = 'published' and deleted_at is null and public.author_is_visible(author_id))
         or (author_id = (select auth.uid()) and deleted_at is null)
         or (select public.has_staff_role('moderator')));
create policy qa_answers_insert on public.qa_answers for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_verified_user())
              and exists (select 1 from public.qa_questions q where q.id = question_id and q.status = 'published' and q.deleted_at is null));
create policy qa_answers_update_own on public.qa_answers for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

grant select, delete on public.qa_votes to authenticated;
grant insert (answer_id) on public.qa_votes to authenticated;
create policy qa_votes_own on public.qa_votes for all to authenticated
  using (voter_id = (select auth.uid()))
  with check (voter_id = (select auth.uid()) and (select public.is_verified_user())
              and exists (select 1 from public.qa_answers a where a.id = answer_id and a.status = 'published' and a.author_id is distinct from (select auth.uid())));

grant all on public.qa_questions, public.qa_answers, public.qa_votes to service_role;
