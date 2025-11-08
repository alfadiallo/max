-- 002_transcripts_rag.sql
-- Schema additions for transcript workflow and RAG ingestion

begin;

-- Bootstrap content_sources if the base table has not been created yet.
create table if not exists content_sources (
  id uuid primary key default gen_random_uuid(),
  title text,
  created_at timestamptz default now()
);

-- Add transcription workflow fields to content_sources
alter table content_sources
  add column if not exists title text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists transcription_status text default 'pending_review',
  add column if not exists rag_last_submitted_at timestamptz,
  add column if not exists rag_processed_version_id uuid;

create table if not exists transcript_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references content_sources(id) on delete cascade,
  version_label text not null,
  transcript_text text not null,
  metadata_json jsonb default '{}',
  reviewer_id uuid references auth.users(id),
  verified_at timestamptz,
  is_latest boolean default false,
  created_at timestamptz default now()
);

create unique index if not exists idx_transcript_versions_latest
  on transcript_versions(source_id)
  where is_latest;

create table if not exists transcript_segments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid references transcript_versions(id) on delete cascade,
  sequence_number integer not null,
  start_time interval,
  end_time interval,
  text text not null,
  created_at timestamptz default now(),
  unique(version_id, sequence_number)
);

create table if not exists rag_ingestion_queue (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references content_sources(id) on delete cascade,
  version_id uuid references transcript_versions(id) on delete cascade,
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz default now(),
  status text default 'queued',
  error_detail text,
  result_summary jsonb,
  processed_at timestamptz
);

commit;
