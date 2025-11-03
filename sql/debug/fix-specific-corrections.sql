-- =====================================================
-- Fix Specific Corrections for #2 Intro audio file
-- =====================================================
-- Update dictionary_corrections_applied to show only changed words
-- =====================================================

-- First, let's see what we have
SELECT 
  v.id as version_id,
  v.version_type,
  v.dictionary_corrections_applied,
  af.file_name,
  af.display_name
FROM max_transcription_versions v
JOIN max_transcriptions t ON t.id = v.transcription_id
JOIN max_audio_files af ON af.id = t.audio_file_id
WHERE af.file_name LIKE '%#2 Intro%' 
  OR af.display_name LIKE '%#2 Intro%'
  AND v.version_type = 'H-1'
ORDER BY v.created_at DESC;

-- This will show the current corrections
-- Then you can manually update them, or we can create a Node.js script to do it

