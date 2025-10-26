-- =====================================================
-- Drop contra- Tables Script
-- =====================================================
-- This removes all tables that start with "contra-"
-- Preserves member tables and auth.users
-- =====================================================

-- First, let's see what contra- tables exist
-- You can run this query to check:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE 'contra_%';

-- =====================================================
-- Drop contra- tables (adjust based on what you have)
-- =====================================================

DROP TABLE IF EXISTS "contra_users" CASCADE;
DROP TABLE IF EXISTS "contra_projects" CASCADE;
DROP TABLE IF EXISTS "contra_audio_files" CASCADE;
DROP TABLE IF EXISTS "contra_transcriptions" CASCADE;
DROP TABLE IF EXISTS "contra_transcription_versions" CASCADE;
DROP TABLE IF EXISTS "contra_dictionary" CASCADE;
DROP TABLE IF EXISTS "contra_translations" CASCADE;
DROP TABLE IF EXISTS "contra_translation_versions" CASCADE;
DROP TABLE IF EXISTS "contra_generated_summaries" CASCADE;
DROP TABLE IF EXISTS "contra_prompt_templates" CASCADE;
DROP TABLE IF EXISTS "contra_prompt_versions" CASCADE;
DROP TABLE IF EXISTS "contra_feedback_log" CASCADE;
DROP TABLE IF EXISTS "contra_project_types" CASCADE;

-- Add any other contra- tables you have here

-- =====================================================
-- Verification Query
-- =====================================================

-- After running the drops above, verify no contra- tables remain:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name LIKE 'contra_%';
-- (This should return 0 rows)

-- =====================================================
-- Verification
-- =====================================================

-- ✅ Contra- tables should now be dropped!
-- To verify, run this query:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'contra_%';

