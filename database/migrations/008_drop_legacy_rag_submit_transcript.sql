-- 008_drop_legacy_rag_submit_transcript.sql
-- Removes legacy overload of rag_submit_transcript that lacked p_max_version_id,
-- leaving only the current function signature.

begin;

drop function if exists public.rag_submit_transcript(
  text,
  text,
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  timestamptz
);

commit;


