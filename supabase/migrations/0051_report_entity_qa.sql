-- 0051 · Stage P3: Q&A questions and answers can be reported. (Own file: a new enum value can't be
-- used in the same transaction that adds it.)
alter type public.report_entity add value if not exists 'qa_question';
alter type public.report_entity add value if not exists 'qa_answer';
