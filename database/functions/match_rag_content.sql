-- match_rag_content.sql
-- Vector search over content_segments for Max RAG UI

create or replace function public.match_rag_content(
  p_distance_threshold double precision default 0.5,
  p_limit integer default 10,
  p_query_embedding vector
)
returns table (
  segment_id uuid,
  source_id uuid,
  version_id uuid,
  segment_text text,
  sequence_number integer,
  start_timestamp interval,
  end_timestamp interval,
  created_at timestamptz,
  distance double precision,
  relevance_dentist numeric,
  relevance_dental_assistant numeric,
  relevance_hygienist numeric,
  relevance_treatment_coordinator numeric,
  relevance_align_rep numeric,
  content_type text,
  clinical_complexity text,
  primary_focus text,
  topics text[],
  confidence_score numeric
) as $$
  select
    cs.id as segment_id,
    cs.source_id,
    cs.version_id,
    cs.segment_text,
    cs.sequence_number,
    cs.start_timestamp,
    cs.end_timestamp,
    cs.created_at,
    (cs.embedding <-> p_query_embedding) as distance,
    sr.relevance_dentist,
    sr.relevance_dental_assistant,
    sr.relevance_hygienist,
    sr.relevance_treatment_coordinator,
    sr.relevance_align_rep,
    sr.content_type,
    sr.clinical_complexity,
    sr.primary_focus,
    sr.topics,
    sr.confidence_score
  from content_segments cs
  left join segment_relevance sr on sr.segment_id = cs.id
  where cs.embedding is not null
    and (cs.embedding <-> p_query_embedding) <= p_distance_threshold
  order by cs.embedding <-> p_query_embedding
  limit p_limit
$$ language sql stable;
