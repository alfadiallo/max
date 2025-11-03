-- =====================================================
-- Fix Corrections for #2 Intro audio file H-1 version
-- =====================================================
-- This will update dictionary_corrections_applied to show only changed words
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, let's see what we have
SELECT 
  v.id as version_id,
  v.version_type,
  v.dictionary_corrections_applied,
  af.file_name,
  af.display_name,
  v.edited_text
FROM max_transcription_versions v
JOIN max_transcriptions t ON t.id = v.transcription_id
JOIN max_audio_files af ON af.id = t.audio_file_id
WHERE (af.file_name LIKE '%#2 Intro%' OR af.display_name LIKE '%#2 Intro%')
  AND v.version_type = 'H-1';

-- =====================================================
-- To fix the corrections, you need to:
-- 1. Run the query above to see the current corrections
-- 2. Manually compute the diff for each correction
-- 3. Update the dictionary_corrections_applied column
-- 
-- OR use the API endpoint: POST /api/admin/fix-corrections
-- with body: { "audio_file_name": "#2 Intro to the software and tools.m4a" }
-- =====================================================

-- Example: If you know the version_id, you can update it like this:
-- (Replace VERSION_ID_HERE with the actual UUID and update the corrections array)

/*
UPDATE max_transcription_versions
SET dictionary_corrections_applied = 
  jsonb_build_array(
    jsonb_build_object(
      'original_text', 'Carla',           -- Only the changed word
      'corrected_text', 'Karla',          -- Only the changed word
      'position_start', 10.5,             -- Keep original position
      'position_end', 12.3,               -- Keep original position
      'context_before', "I'm",            -- Context before the change
      'context_after', 'Soto'             -- Context after the change
    )
    -- Add second correction here if needed
  )
WHERE id = 'VERSION_ID_HERE';
*/

