-- 0053 · Q&A triggers: drop the API-caller guards from 0052. Column grants already stop API callers
-- from setting status / is_pinned / is_official / author, and auth.role() still says 'authenticated'
-- inside trigger-driven updates (e.g. auto-hide after 3 reports), which the guard wrongly reverted.
create or replace function private.qa_questions_before()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vendor_id is not null and (tg_op = 'INSERT' or new.vendor_id is distinct from old.vendor_id) then
    select v.city_id into new.city_id from public.vendors v where v.id = new.vendor_id;
  end if;
  if tg_op = 'UPDATE' and new.accepted_answer_id is distinct from old.accepted_answer_id and new.accepted_answer_id is not null then
    if not exists (select 1 from public.qa_answers a where a.id = new.accepted_answer_id and a.question_id = new.id and a.status = 'published' and a.deleted_at is null) then
      raise exception 'That answer does not belong to this question.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

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
  end if;
  return new;
end;
$$;
