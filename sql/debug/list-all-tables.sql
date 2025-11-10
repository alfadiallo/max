-- =====================================================
-- List All Tables in Key Elements Supabase Database
-- =====================================================
-- This query lists all tables in the public schema
-- Grouped by prefix to identify foreign tables
-- =====================================================

-- List all tables in public schema
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE 'max_%' THEN 'max_* (VALID)'
    WHEN table_name LIKE 'insight_%' THEN 'insight_* (VALID)'
    WHEN table_name LIKE 'membr_%' THEN 'membr_* (VALID)'
    WHEN table_name LIKE 'auth.%' THEN 'auth.* (SUPABASE - PRESERVE)'
    WHEN table_name LIKE 'storage.%' THEN 'storage.* (SUPABASE - PRESERVE)'
    ELSE 'UNKNOWN - NEEDS REVIEW'
  END AS table_category
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

-- Summary count by category
SELECT 
  category,
  COUNT(*) AS table_count
FROM (
  SELECT 
    CASE 
      WHEN table_name LIKE 'max_%' THEN 'max_* tables'
      WHEN table_name LIKE 'insight_%' THEN 'insight_* tables'
      WHEN table_name LIKE 'membr_%' THEN 'membr_* tables'
      ELSE 'Other tables (POTENTIALLY INVALID)'
    END AS category
  FROM information_schema.tables 
  WHERE table_schema = 'public'
) AS categorized
GROUP BY category
ORDER BY 
  CASE 
    WHEN category = 'max_* tables' THEN 1
    WHEN category = 'insight_* tables' THEN 2
    WHEN category = 'membr_* tables' THEN 3
    ELSE 4
  END;

-- List tables that are NOT max_*, insight_*, or membr_*
-- These are the ones that might need to be removed
SELECT 
  table_name,
  'POTENTIALLY INVALID - Review before dropping' AS status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name NOT LIKE 'max_%'
  AND table_name NOT LIKE 'insight_%'
  AND table_name NOT LIKE 'membr_%'
ORDER BY table_name;

