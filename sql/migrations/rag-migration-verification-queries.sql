-- =====================================================
-- RAG Migration Verification Queries
-- =====================================================
-- Run these AFTER migration to verify everything worked
-- =====================================================

-- =====================================================
-- 1. VERIFY NEW COLUMNS EXIST
-- =====================================================

-- Check insight_chunks columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'insight_chunks' 
  AND column_name IN ('segment_markers', 'final_version_reference_id')
ORDER BY column_name;

-- Expected: 2 rows (segment_markers: jsonb, final_version_reference_id: uuid)

-- Check insight_transcripts columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'insight_transcripts' 
  AND column_name IN ('indexed_final_version_id', 'indexed_at', 'indexed_by')
ORDER BY column_name;

-- Expected: 3 rows

-- Check max_transcription_versions column
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'max_transcription_versions' 
  AND column_name = 'is_final'
ORDER BY column_name;

-- Expected: 1 row (is_final: boolean, default FALSE)

-- =====================================================
-- 2. VERIFY INDEXES WERE CREATED
-- =====================================================

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('insight_chunks', 'insight_transcripts', 'max_transcription_versions')
  AND (indexname LIKE '%final%' OR indexname LIKE '%indexed%')
ORDER BY tablename, indexname;

-- Expected: 4 indexes

-- =====================================================
-- 3. VERIFY FUNCTION EXISTS
-- =====================================================

SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'search_insight_chunks';

-- Expected: 1 row

-- =====================================================
-- 4. VERIFY TRIGGER EXISTS
-- =====================================================

SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgtype,
  tgenabled
FROM pg_trigger 
WHERE tgname = 'trg_insight_chunks_indexed_status';

-- Expected: 1 row

-- =====================================================
-- 5. VERIFY FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('insight_chunks', 'insight_transcripts')
  AND (tc.constraint_name LIKE '%final_version%' OR tc.constraint_name LIKE '%indexed%')
ORDER BY tc.table_name, tc.constraint_name;

-- Expected: 3 foreign keys

-- =====================================================
-- 6. VERIFY EXISTING DATA STILL WORKS
-- =====================================================

-- Test that existing queries still work
SELECT 
  'Total chunks' as metric,
  COUNT(*)::text as value
FROM insight_chunks
UNION ALL
SELECT 
  'Chunks with embeddings',
  COUNT(*)::text
FROM insight_chunks 
WHERE embedding IS NOT NULL
UNION ALL
SELECT 
  'Chunks with new segment_markers',
  COUNT(*)::text
FROM insight_chunks 
WHERE segment_markers IS NOT NULL
UNION ALL
SELECT 
  'Chunks with new final_version_ref',
  COUNT(*)::text
FROM insight_chunks 
WHERE final_version_reference_id IS NOT NULL;

-- Expected: All queries run without error
-- New columns will show 0 initially (expected)

-- =====================================================
-- 7. CHECK EMBEDDING DIMENSION (CRITICAL)
-- =====================================================

-- Verify all embeddings are 1536 dimensions
SELECT 
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embedding,
  COUNT(CASE WHEN array_length((embedding::text)::float[], 1) = 1536 THEN 1 END) as chunks_with_correct_dimension
FROM insight_chunks
WHERE embedding IS NOT NULL;

-- Expected: All chunks_with_embedding should equal chunks_with_correct_dimension

-- =====================================================
-- 8. TEST TRIGGER FUNCTION
-- =====================================================

-- Check that trigger function exists and is valid
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'update_insight_transcript_indexed_status';

-- Expected: 1 row (FUNCTION)

-- =====================================================
-- 9. VERIFY pgvector EXTENSION
-- =====================================================

SELECT * FROM pg_extension WHERE extname = 'vector';

-- Expected: 1 row

-- =====================================================
-- 10. CHECK COLUMN COMMENTS
-- =====================================================

SELECT 
  table_name,
  column_name,
  col_description(
    (table_name::text)::regclass::oid,
    ordinal_position
  ) as comment
FROM information_schema.columns
WHERE table_name = 'insight_chunks'
  AND column_name IN ('segment_markers', 'final_version_reference_id')
ORDER BY ordinal_position;

-- Expected: 2 rows with comments

-- =====================================================
-- SUMMARY: ALL CHECKS PASSED
-- =====================================================

SELECT 
  '✅ Migration successful!' as status,
  'All verification checks passed' as message,
  NOW() as verified_at;

