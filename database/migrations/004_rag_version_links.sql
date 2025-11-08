-- 004_rag_version_links.sql
-- Link RAG records back to max transcription versions for UI status mapping

begin;

alter table transcript_versions
  add column if not exists max_version_id uuid;

alter table rag_ingestion_queue
  add column if not exists source_max_version_id uuid;

commit;
