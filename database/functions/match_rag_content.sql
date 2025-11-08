-- match_rag_content.sql
-- Vector search over content_segments for Max RAG UI

create or replace function match_rag_content(
  p_query_embedding vector,
  p_limit integer default 10,
  p_distance_threshold double precision default 0.5
)
returns table (
  segment_id uuid,
  source_id uuid,
  version_id uuid,
  segment_text text,
  sequence_number integer,
  start_timestamp interval,
  end_timestamp interval,
  distance double precision
) as $$
  select
    cs.id as segment_id,
    cs.source_id,
    cs.version_id,
    cs.segment_text,
    cs.sequence_number,
    cs.start_timestamp,
    cs.end_timestamp,
    (cs.embedding <-> p_query_embedding) as distance
  from content_segments cs
  where cs.embedding is not null
    and (cs.embedding <-> p_query_embedding) <= p_distance_threshold
  order by cs.embedding <-> p_query_embedding
  limit p_limit
$$ language sql stable;
