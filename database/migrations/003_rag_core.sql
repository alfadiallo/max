-- 003_rag_core.sql
-- Core RAG storage tables: content segments, relevance, knowledge graph, query logging

begin;

create extension if not exists vector;

create table if not exists content_segments (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references content_sources(id) on delete cascade,
  version_id uuid references transcript_versions(id) on delete cascade,
  segment_text text not null,
  sequence_number integer not null,
  start_timestamp interval,
  end_timestamp interval,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(version_id, sequence_number)
);

create table if not exists segment_relevance (
  segment_id uuid primary key references content_segments(id) on delete cascade,
  relevance_dentist numeric default 0,
  relevance_dental_assistant numeric default 0,
  relevance_hygienist numeric default 0,
  relevance_treatment_coordinator numeric default 0,
  relevance_align_rep numeric default 0,
  content_type text,
  clinical_complexity text,
  primary_focus text,
  topics text[] default '{}',
  confidence_score numeric,
  created_at timestamptz default now()
);

create table if not exists kg_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  canonical_name text not null,
  aliases text[] default '{}',
  definition text,
  domain text,
  complexity_level integer,
  embedding vector(1536),
  mention_count integer default 0,
  last_mentioned_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(entity_type, canonical_name)
);

create table if not exists kg_relationships (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid references kg_entities(id) on delete cascade,
  target_entity_id uuid references kg_entities(id) on delete cascade,
  relationship_type text not null,
  strength numeric,
  confidence numeric,
  context text,
  source_segment_id uuid references content_segments(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(source_entity_id, target_entity_id, relationship_type)
);

create table if not exists segment_entities (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid references content_segments(id) on delete cascade,
  entity_id uuid references kg_entities(id) on delete cascade,
  mention_type text,
  relevance_score numeric,
  extraction_confidence numeric,
  created_at timestamptz default now(),
  unique(segment_id, entity_id)
);

create table if not exists user_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  query_text text not null,
  query_embedding vector(1536),
  intent text,
  extracted_entities jsonb,
  segments_returned uuid[],
  total_results integer,
  response_time_ms integer,
  segments_clicked uuid[],
  helpful boolean,
  feedback_comment text,
  created_at timestamptz default now()
);

commit;
