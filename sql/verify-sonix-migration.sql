-- =====================================================
-- Verify Sonix Migration Has Been Run
-- =====================================================
-- This query checks if all columns and indexes from
-- supabase-add-sonix-support.sql have been created
-- =====================================================

-- Check max_audio_files columns
SELECT 
    'max_audio_files' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'max_audio_files'
  AND column_name IN ('sonix_media_id', 'file_type', 'sonix_status')
ORDER BY column_name;

-- Check max_transcriptions columns
SELECT 
    'max_transcriptions' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'max_transcriptions'
  AND column_name IN ('source', 'final_version_id')
ORDER BY column_name;

-- Check indexes on max_audio_files
SELECT 
    'max_audio_files indexes' as check_type,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'max_audio_files'
  AND indexname LIKE '%sonix%'
ORDER BY indexname;

-- Check indexes on max_transcriptions
SELECT 
    'max_transcriptions indexes' as check_type,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'max_transcriptions'
  AND (indexname LIKE '%source%' OR indexname LIKE '%final_version%')
ORDER BY indexname;

-- Summary: Count missing columns
SELECT 
    'Summary' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'max_audio_files' AND column_name = 'sonix_media_id'
        ) THEN '✅ sonix_media_id exists'
        ELSE '❌ sonix_media_id MISSING'
    END as sonix_media_id_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'max_audio_files' AND column_name = 'file_type'
        ) THEN '✅ file_type exists'
        ELSE '❌ file_type MISSING'
    END as file_type_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'max_audio_files' AND column_name = 'sonix_status'
        ) THEN '✅ sonix_status exists'
        ELSE '❌ sonix_status MISSING'
    END as sonix_status_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'max_transcriptions' AND column_name = 'source'
        ) THEN '✅ source exists'
        ELSE '❌ source MISSING'
    END as source_check,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'max_transcriptions' AND column_name = 'final_version_id'
        ) THEN '✅ final_version_id exists'
        ELSE '⚠️ final_version_id missing (may already exist)'
    END as final_version_id_check;

