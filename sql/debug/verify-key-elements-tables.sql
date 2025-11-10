-- =====================================================
-- Verify Key Elements Database Tables
-- =====================================================
-- Run this AFTER cleanup to verify only correct tables exist
-- =====================================================

-- =====================================================
-- 1. List All Remaining Tables
-- =====================================================
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE 'max_%' THEN '✅ VALID - max_*'
    WHEN table_name LIKE 'insight_%' THEN '✅ VALID - insight_*'
    WHEN table_name LIKE 'membr_%' THEN '✅ VALID - membr_*'
    ELSE '⚠️  UNEXPECTED - Should not exist!'
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY 
  CASE 
    WHEN table_name LIKE 'max_%' THEN 1
    WHEN table_name LIKE 'insight_%' THEN 2
    WHEN table_name LIKE 'membr_%' THEN 3
    ELSE 4
  END,
  table_name;

-- =====================================================
-- 2. Count Tables by Category
-- =====================================================
SELECT 
  category,
  count,
  table_names
FROM (
  SELECT 
    CASE 
      WHEN table_name LIKE 'max_%' THEN 'max_* tables'
      WHEN table_name LIKE 'insight_%' THEN 'insight_* tables'
      WHEN table_name LIKE 'membr_%' THEN 'membr_* tables'
      ELSE '⚠️  Unexpected tables'
    END AS category,
    COUNT(*) AS count,
    STRING_AGG(table_name, ', ' ORDER BY table_name) AS table_names
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  GROUP BY 
    CASE 
      WHEN table_name LIKE 'max_%' THEN 'max_* tables'
      WHEN table_name LIKE 'insight_%' THEN 'insight_* tables'
      WHEN table_name LIKE 'membr_%' THEN 'membr_* tables'
      ELSE '⚠️  Unexpected tables'
    END
) AS categorized
ORDER BY 
  CASE 
    WHEN category = 'max_* tables' THEN 1
    WHEN category = 'insight_* tables' THEN 2
    WHEN category = 'membr_* tables' THEN 3
    ELSE 4
  END;

-- =====================================================
-- 3. List Any Unexpected Tables
-- =====================================================
-- These should be empty after cleanup
SELECT 
  table_name,
  '⚠️  This table should not exist!' AS alert
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name NOT LIKE 'max_%'
  AND table_name NOT LIKE 'insight_%'
  AND table_name NOT LIKE 'membr_%'
  -- Exclude Supabase system tables (these are OK)
  AND table_name NOT IN (
    'schema_migrations',
    'supabase_migrations'
  )
ORDER BY table_name;

-- =====================================================
-- 4. Check for Orphaned Foreign Key Constraints
-- =====================================================
-- Find any foreign keys that reference non-existent tables
SELECT 
  tc.constraint_name,
  tc.table_name AS referencing_table,
  kcu.column_name AS referencing_column,
  ccu.table_name AS referenced_table,
  '⚠️  Orphaned FK - Referenced table does not exist!' AS alert
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  -- Check if referenced table exists
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = ccu.table_name
  )
ORDER BY tc.table_name, ccu.table_name;

-- =====================================================
-- 5. Verify Expected max_* Tables Exist
-- =====================================================
-- Based on migrations, these tables should exist:
SELECT 
  table_name,
  status
FROM (
  WITH expected_tables AS (
    SELECT unnest(ARRAY[
      'max_users',
      'max_project_types',
      'max_projects',
      'max_audio_files',
      'max_transcriptions',
      'max_transcription_versions',
      'max_dictionary',
      'max_translations',
      'max_translation_versions',
      'max_generated_summaries',
      'max_prompt_templates',
      'max_prompt_versions',
      'max_feedback_log',
      'max_transcription_analyses',
      'max_transcription_correction_patterns',
      'max_generated_speech'
    ]) AS table_name
  )
  SELECT 
    et.table_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name = et.table_name
      ) THEN '✅ EXISTS'
      ELSE '❌ MISSING'
    END AS status
  FROM expected_tables et
) AS table_status
ORDER BY 
  CASE WHEN status = '❌ MISSING' THEN 1 ELSE 2 END,
  table_name;

-- =====================================================
-- 6. Verify Expected insight_* Tables Exist
-- =====================================================
SELECT 
  table_name,
  status
FROM (
  WITH expected_tables AS (
    SELECT unnest(ARRAY[
      'insight_transcripts',
      'insight_metadata',
      'insight_tags',
      'insight_pipeline_status',
      'insight_content_outputs',
      'insight_chunks'
    ]) AS table_name
  )
  SELECT 
    et.table_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name = et.table_name
      ) THEN '✅ EXISTS'
      ELSE '❌ MISSING'
    END AS status
  FROM expected_tables et
) AS table_status
ORDER BY 
  CASE WHEN status = '❌ MISSING' THEN 1 ELSE 2 END,
  table_name;

-- =====================================================
-- 7. Summary Report
-- =====================================================
SELECT 
  metric,
  value
FROM (
  SELECT 
    'Total tables in public schema' AS metric,
    COUNT(*)::text AS value
  FROM information_schema.tables 
  WHERE table_schema = 'public'
  UNION ALL
  SELECT 
    'max_* tables' AS metric,
    COUNT(*)::text AS value
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name LIKE 'max_%'
  UNION ALL
  SELECT 
    'insight_* tables' AS metric,
    COUNT(*)::text AS value
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name LIKE 'insight_%'
  UNION ALL
  SELECT 
    'membr_* tables' AS metric,
    COUNT(*)::text AS value
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name LIKE 'membr_%'
  UNION ALL
  SELECT 
    'Unexpected tables' AS metric,
    COUNT(*)::text AS value
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name NOT LIKE 'max_%'
    AND table_name NOT LIKE 'insight_%'
    AND table_name NOT LIKE 'membr_%'
    AND table_name NOT IN ('schema_migrations', 'supabase_migrations')
) AS summary
ORDER BY 
  CASE 
    WHEN metric LIKE '%Unexpected%' THEN 1
    ELSE 2
  END,
  metric;

