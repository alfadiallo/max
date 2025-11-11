-- RAG Data Verification Script
-- Run this to check the health of your RAG system

-- 1. Overall counts
SELECT 
  '=== OVERALL COUNTS ===' as section,
  (SELECT COUNT(*) FROM content_segments) as total_segments,
  (SELECT COUNT(*) FROM content_segments WHERE embedding IS NOT NULL) as segments_with_embeddings,
  (SELECT COUNT(*) FROM kg_entities) as total_entities,
  (SELECT COUNT(*) FROM kg_relationships) as total_relationships,
  (SELECT COUNT(*) FROM user_queries) as total_queries;

-- 2. Segments by source
SELECT 
  '=== SEGMENTS BY SOURCE ===' as section,
  cs.title as source_title,
  tv.version_label,
  COUNT(seg.id) as segment_count,
  COUNT(seg.embedding) as embeddings_count,
  AVG(LENGTH(seg.segment_text)) as avg_segment_length,
  MAX(LENGTH(seg.segment_text)) as max_segment_length,
  MIN(LENGTH(seg.segment_text)) as min_segment_length
FROM content_sources cs
LEFT JOIN transcript_versions tv ON tv.source_id = cs.id
LEFT JOIN content_segments seg ON seg.version_id = tv.id
WHERE cs.id IN (
  SELECT DISTINCT source_id FROM content_segments
)
GROUP BY cs.id, cs.title, tv.version_label
ORDER BY segment_count DESC;

-- 3. Check for segments without embeddings
SELECT 
  '=== SEGMENTS WITHOUT EMBEDDINGS ===' as section,
  COUNT(*) as count,
  STRING_AGG(DISTINCT cs.title, ', ') as affected_sources
FROM content_segments seg
JOIN content_sources cs ON cs.id = seg.source_id
WHERE seg.embedding IS NULL;

-- 4. Sample segments (verify chunking)
SELECT 
  '=== SAMPLE SEGMENTS (check chunking) ===' as section,
  seg.version_id,
  seg.sequence_number,
  LENGTH(seg.segment_text) as char_count,
  LEFT(seg.segment_text, 100) as preview,
  CASE 
    WHEN seg.embedding IS NULL THEN 'NO EMBEDDING ❌'
    ELSE 'HAS EMBEDDING ✅'
  END as embedding_status
FROM content_segments seg
ORDER BY seg.created_at DESC
LIMIT 10;

-- 5. Query success rate
SELECT 
  '=== QUERY ANALYTICS ===' as section,
  COUNT(*) as total_queries,
  COUNT(*) FILTER (WHERE total_results > 0) as successful_queries,
  COUNT(*) FILTER (WHERE total_results = 0) as zero_results,
  ROUND(100.0 * COUNT(*) FILTER (WHERE total_results > 0) / NULLIF(COUNT(*), 0), 1) as success_rate_pct,
  ROUND(AVG(total_results), 1) as avg_results_per_query,
  COUNT(*) FILTER (WHERE helpful = true) as helpful_count,
  COUNT(*) FILTER (WHERE helpful = false) as not_helpful_count
FROM user_queries;

-- 6. Recent queries with zero results (indicates problems)
SELECT 
  '=== RECENT ZERO-RESULT QUERIES ===' as section,
  created_at,
  query_text,
  'No results found - possible data issue' as note
FROM user_queries
WHERE total_results = 0
ORDER BY created_at DESC
LIMIT 10;

-- 7. Entity distribution (if using Claude analysis)
SELECT 
  '=== ENTITY TYPES ===' as section,
  entity_type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT canonical_name, ', ' ORDER BY canonical_name LIMIT 5) as sample_entities
FROM kg_entities
GROUP BY entity_type
ORDER BY count DESC;

-- 8. Jobs status
SELECT 
  '=== INGESTION JOBS ===' as section,
  status,
  COUNT(*) as count,
  MAX(submitted_at) as last_submitted
FROM rag_ingestion_queue
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'processing' THEN 1
    WHEN 'queued' THEN 2
    WHEN 'error' THEN 3
    WHEN 'complete' THEN 4
  END;

-- 9. Check for stale processing jobs (stuck for > 10 minutes)
SELECT 
  '=== STALE JOBS (stuck in processing) ===' as section,
  id,
  submitted_at,
  NOW() - submitted_at as stuck_duration,
  'Should be reset to queued' as action
FROM rag_ingestion_queue
WHERE status = 'processing'
AND submitted_at < NOW() - INTERVAL '10 minutes'
ORDER BY submitted_at;

-- 10. Test data pollution check
SELECT 
  '=== POTENTIAL TEST DATA ===' as section,
  cs.title,
  COUNT(seg.id) as segment_count,
  STRING_AGG(DISTINCT tv.version_label, ', ') as versions,
  MIN(cs.created_at) as first_created,
  MAX(cs.created_at) as last_created,
  CASE 
    WHEN cs.title ILIKE '%test%' THEN '⚠️ Looks like test data'
    WHEN COUNT(tv.id) > 3 THEN '⚠️ Multiple versions (possible re-testing)'
    ELSE '✅ Looks normal'
  END as assessment
FROM content_sources cs
LEFT JOIN transcript_versions tv ON tv.source_id = cs.id
LEFT JOIN content_segments seg ON seg.source_id = cs.id
GROUP BY cs.id, cs.title
ORDER BY segment_count DESC;

-- RECOMMENDATIONS
SELECT 
  '=== RECOMMENDATIONS ===' as section,
  CASE 
    WHEN (SELECT COUNT(*) FROM content_segments WHERE embedding IS NULL) > 0 
      THEN 'Run worker to generate missing embeddings'
    WHEN (SELECT COUNT(*) FROM user_queries WHERE total_results = 0) > (SELECT COUNT(*) FROM user_queries) * 0.5
      THEN 'More than 50% of queries return zero results - check data quality'
    WHEN (SELECT COUNT(*) FROM rag_ingestion_queue WHERE status = 'processing' AND submitted_at < NOW() - INTERVAL '10 minutes') > 0
      THEN 'Reset stale processing jobs'
    ELSE '✅ System looks healthy'
  END as recommendation;

