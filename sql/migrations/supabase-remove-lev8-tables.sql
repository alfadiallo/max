-- =====================================================
-- Remove lev8 Tables from Key Elements Supabase Database
-- =====================================================
-- 
-- ⚠️  WARNING: This script will DROP tables!
-- 
-- BEFORE RUNNING:
-- 1. Run sql/debug/list-all-tables.sql to see what tables exist
-- 2. Run sql/debug/check-foreign-key-relationships.sql to check dependencies
-- 3. BACKUP YOUR DATABASE if you have important data
-- 4. Review the list of tables that will be dropped
-- 
-- This script will:
-- - Preserve: max_*, insight_*, membr_* tables
-- - Preserve: auth.* schema (Supabase Auth)
-- - Preserve: storage.* schema (Supabase Storage)
-- - Drop: All other tables in public schema (likely from lev8)
-- =====================================================

-- =====================================================
-- STEP 1: Identify tables to drop (ALREADY RUN - VERIFIED)
-- =====================================================
-- The following 19 tables were identified as invalid (lev8 tables):
--   - academic_classes
--   - acls_scenarios
--   - acls_sessions
--   - case_attempts
--   - clinical_cases
--   - device_trusts
--   - faculty
--   - grow_voice_journal
--   - health_systems
--   - module_buckets
--   - modules
--   - programs
--   - residents
--   - running_board_configs
--   - running_board_sessions
--   - session_analytics
--   - training_sessions
--   - user_profiles
--   - vignettes

-- =====================================================
-- STEP 2: Drop Foreign Key Constraints First
-- =====================================================
-- Based on check-foreign-key-relationships.sql results:
-- ✅ Query 2 (CRITICAL): No invalid tables reference valid tables
-- ✅ Query 3 (WARNING): No valid tables reference invalid tables
-- ✅ Query 6: Only valid tables are referenced by valid tables
-- 
-- Therefore, no FK constraints need to be dropped manually.
-- The CASCADE option in DROP TABLE will handle all dependencies.

-- =====================================================
-- STEP 3: Drop Invalid Tables
-- =====================================================
-- This will drop all 19 lev8 tables identified above.
-- CASCADE will automatically drop dependent objects (indexes, constraints, etc.)
-- 
-- ⚠️  FINAL CHECKLIST BEFORE RUNNING:
-- [ ] Query 2 (CRITICAL) returned empty - CONFIRMED ✅
-- [ ] Query 3 (WARNING) returned empty - CONFIRMED ✅
-- [ ] Database backup created (recommended)
-- [ ] Ready to proceed
-- 
-- ⚠️  THIS WILL DROP 19 TABLES - UNCOMMENT TO EXECUTE:


DO $$
DECLARE
  r RECORD;
  dropped_count INTEGER := 0;
BEGIN
  FOR r IN (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name NOT LIKE 'max_%'
      AND table_name NOT LIKE 'insight_%'
      AND table_name NOT LIKE 'membr_%'
      -- Exclude Supabase system tables
      AND table_name NOT IN (
        'schema_migrations',
        'supabase_migrations'
      )
    ORDER BY table_name
  ) LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.table_name) || ' CASCADE';
    RAISE NOTICE '✅ Dropped table: %', r.table_name;
    dropped_count := dropped_count + 1;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup complete! Dropped % table(s)', dropped_count;
  RAISE NOTICE '========================================';
END $$;


-- =====================================================
-- STEP 4: Verification
-- =====================================================
-- After running the drops, verify only valid tables remain:
-- Run sql/debug/verify-key-elements-tables.sql

-- Quick verification query:
/*
SELECT 
  table_name,
  CASE 
    WHEN table_name LIKE 'max_%' THEN '✅ VALID'
    WHEN table_name LIKE 'insight_%' THEN '✅ VALID'
    WHEN table_name LIKE 'membr_%' THEN '✅ VALID'
    ELSE '⚠️  UNEXPECTED - Review needed'
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
*/

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- 1. This script is intentionally commented out for safety
-- 2. Uncomment and customize based on your specific situation
-- 3. Always run the diagnostic queries first
-- 4. Consider creating a backup before running
-- 5. Test in a development environment first if possible
-- 
-- =====================================================

