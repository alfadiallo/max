-- =====================================================
-- Check Foreign Key Relationships - CRITICAL SAFETY CHECK
-- =====================================================
-- This script analyzes all foreign key relationships to ensure
-- no invalid tables are connected to valid tables (max_*, insight_*, membr_*)
-- =====================================================
-- 
-- IMPORTANT: Run this BEFORE dropping any tables!
-- If any invalid tables reference valid tables, we need to handle them carefully.
-- =====================================================

-- =====================================================
-- 1. All Foreign Key Constraints in the Database
-- =====================================================
SELECT 
  constraint_name,
  referencing_table,
  referencing_column,
  referenced_table,
  referenced_column,
  relationship_status
FROM (
  SELECT 
    tc.constraint_name,
    tc.table_name AS referencing_table,
    kcu.column_name AS referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column,
    CASE 
      WHEN tc.table_name LIKE 'max_%' OR tc.table_name LIKE 'insight_%' OR tc.table_name LIKE 'membr_%' THEN 'VALID'
      WHEN ccu.table_name LIKE 'max_%' OR ccu.table_name LIKE 'insight_%' OR ccu.table_name LIKE 'membr_%' THEN 'VALID'
      ELSE 'REVIEW NEEDED'
    END AS relationship_status
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
) AS fk_relationships
ORDER BY 
  CASE 
    WHEN relationship_status = 'REVIEW NEEDED' THEN 1
    ELSE 2
  END,
  referencing_table,
  referenced_table;

-- =====================================================
-- 2. CRITICAL: Invalid Tables Referencing Valid Tables
-- =====================================================
-- These are tables that should NOT exist but are connected to valid tables
-- This is the most dangerous scenario - we need to handle these carefully
SELECT 
  '⚠️ CRITICAL: Invalid table references valid table' AS alert_level,
  tc.table_name AS invalid_table,
  kcu.column_name AS referencing_column,
  ccu.table_name AS valid_referenced_table,
  ccu.column_name AS referenced_column,
  tc.constraint_name AS fk_constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  -- Invalid table (not max_*, insight_*, or membr_*)
  AND tc.table_name NOT LIKE 'max_%'
  AND tc.table_name NOT LIKE 'insight_%'
  AND tc.table_name NOT LIKE 'membr_%'
  -- But references a valid table
  AND (
    ccu.table_name LIKE 'max_%' 
    OR ccu.table_name LIKE 'insight_%' 
    OR ccu.table_name LIKE 'membr_%'
  )
ORDER BY ccu.table_name, tc.table_name;

-- =====================================================
-- 3. Valid Tables Referencing Invalid Tables
-- =====================================================
-- These are valid tables that reference invalid tables
-- This is also dangerous - we need to drop these FKs before dropping invalid tables
SELECT 
  '⚠️ WARNING: Valid table references invalid table' AS alert_level,
  tc.table_name AS valid_table,
  kcu.column_name AS referencing_column,
  ccu.table_name AS invalid_referenced_table,
  ccu.column_name AS referenced_column,
  tc.constraint_name AS fk_constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  -- Valid table
  AND (
    tc.table_name LIKE 'max_%' 
    OR tc.table_name LIKE 'insight_%' 
    OR tc.table_name LIKE 'membr_%'
  )
  -- But references an invalid table
  AND ccu.table_name NOT LIKE 'max_%'
  AND ccu.table_name NOT LIKE 'insight_%'
  AND ccu.table_name NOT LIKE 'membr_%'
  AND ccu.table_name NOT LIKE 'auth.%'
  AND ccu.table_name NOT LIKE 'storage.%'
ORDER BY tc.table_name, ccu.table_name;

-- =====================================================
-- 4. Invalid Tables Referencing Other Invalid Tables
-- =====================================================
-- These are safe to drop together (they only reference each other)
SELECT 
  'INFO: Invalid table references another invalid table' AS alert_level,
  tc.table_name AS invalid_table,
  kcu.column_name AS referencing_column,
  ccu.table_name AS invalid_referenced_table,
  ccu.column_name AS referenced_column,
  tc.constraint_name AS fk_constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  -- Both tables are invalid
  AND tc.table_name NOT LIKE 'max_%'
  AND tc.table_name NOT LIKE 'insight_%'
  AND tc.table_name NOT LIKE 'membr_%'
  AND ccu.table_name NOT LIKE 'max_%'
  AND ccu.table_name NOT LIKE 'insight_%'
  AND ccu.table_name NOT LIKE 'membr_%'
  AND ccu.table_name NOT LIKE 'auth.%'
  AND ccu.table_name NOT LIKE 'storage.%'
ORDER BY tc.table_name, ccu.table_name;

-- =====================================================
-- 5. Summary: Count of Relationships by Type
-- =====================================================
SELECT 
  relationship_type,
  count
FROM (
  SELECT 
    CASE 
      WHEN tc.table_name NOT LIKE 'max_%' 
           AND tc.table_name NOT LIKE 'insight_%' 
           AND tc.table_name NOT LIKE 'membr_%'
           AND (ccu.table_name LIKE 'max_%' 
                OR ccu.table_name LIKE 'insight_%' 
                OR ccu.table_name LIKE 'membr_%') 
      THEN 'Invalid → Valid (CRITICAL)'
      
      WHEN (tc.table_name LIKE 'max_%' 
            OR tc.table_name LIKE 'insight_%' 
            OR tc.table_name LIKE 'membr_%')
           AND ccu.table_name NOT LIKE 'max_%'
           AND ccu.table_name NOT LIKE 'insight_%'
           AND ccu.table_name NOT LIKE 'membr_%'
           AND ccu.table_name NOT LIKE 'auth.%'
           AND ccu.table_name NOT LIKE 'storage.%'
      THEN 'Valid → Invalid (WARNING)'
      
      WHEN tc.table_name NOT LIKE 'max_%'
           AND tc.table_name NOT LIKE 'insight_%'
           AND tc.table_name NOT LIKE 'membr_%'
           AND ccu.table_name NOT LIKE 'max_%'
           AND ccu.table_name NOT LIKE 'insight_%'
           AND ccu.table_name NOT LIKE 'membr_%'
           AND ccu.table_name NOT LIKE 'auth.%'
           AND ccu.table_name NOT LIKE 'storage.%'
      THEN 'Invalid → Invalid (SAFE)'
      
      ELSE 'Valid → Valid (OK)'
    END AS relationship_type,
    COUNT(*) AS count
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  GROUP BY 
    CASE 
      WHEN tc.table_name NOT LIKE 'max_%' 
           AND tc.table_name NOT LIKE 'insight_%' 
           AND tc.table_name NOT LIKE 'membr_%'
           AND (ccu.table_name LIKE 'max_%' 
                OR ccu.table_name LIKE 'insight_%' 
                OR ccu.table_name LIKE 'membr_%') 
      THEN 'Invalid → Valid (CRITICAL)'
      
      WHEN (tc.table_name LIKE 'max_%' 
            OR tc.table_name LIKE 'insight_%' 
            OR tc.table_name LIKE 'membr_%')
           AND ccu.table_name NOT LIKE 'max_%'
           AND ccu.table_name NOT LIKE 'insight_%'
           AND ccu.table_name NOT LIKE 'membr_%'
           AND ccu.table_name NOT LIKE 'auth.%'
           AND ccu.table_name NOT LIKE 'storage.%'
      THEN 'Valid → Invalid (WARNING)'
      
      WHEN tc.table_name NOT LIKE 'max_%'
           AND tc.table_name NOT LIKE 'insight_%'
           AND tc.table_name NOT LIKE 'membr_%'
           AND ccu.table_name NOT LIKE 'max_%'
           AND ccu.table_name NOT LIKE 'insight_%'
           AND ccu.table_name NOT LIKE 'membr_%'
           AND ccu.table_name NOT LIKE 'auth.%'
           AND ccu.table_name NOT LIKE 'storage.%'
      THEN 'Invalid → Invalid (SAFE)'
      
      ELSE 'Valid → Valid (OK)'
    END
) AS relationship_summary
ORDER BY 
  CASE 
    WHEN relationship_type LIKE '%CRITICAL%' THEN 1
    WHEN relationship_type LIKE '%WARNING%' THEN 2
    WHEN relationship_type LIKE '%SAFE%' THEN 3
    ELSE 4
  END;

-- =====================================================
-- 6. List All Tables Referenced by Valid Tables
-- =====================================================
-- This helps identify what tables valid tables depend on
SELECT 
  referenced_table,
  table_status,
  CASE 
    WHEN table_status LIKE '%VALID%' THEN 1
    WHEN table_status LIKE '%SUPABASE%' THEN 2
    ELSE 3
  END AS sort_order
FROM (
  SELECT DISTINCT
    ccu.table_name AS referenced_table,
    CASE 
      WHEN ccu.table_name LIKE 'max_%' THEN 'max_* (VALID)'
      WHEN ccu.table_name LIKE 'insight_%' THEN 'insight_* (VALID)'
      WHEN ccu.table_name LIKE 'membr_%' THEN 'membr_* (VALID)'
      WHEN ccu.table_name LIKE 'auth.%' THEN 'auth.* (SUPABASE)'
      WHEN ccu.table_name LIKE 'storage.%' THEN 'storage.* (SUPABASE)'
      ELSE '⚠️ UNKNOWN - Review needed'
    END AS table_status
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    -- Only show references FROM valid tables
    AND (
      tc.table_name LIKE 'max_%' 
      OR tc.table_name LIKE 'insight_%' 
      OR tc.table_name LIKE 'membr_%'
    )
) AS referenced_tables
ORDER BY 
  sort_order,
  referenced_table;

