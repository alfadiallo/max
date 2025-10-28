-- Purge H-6 entries and related corrections
-- This removes the problematic version that generated false positive corrections

BEGIN;

-- First, delete the H-6 version from max_transcription_versions
DELETE FROM max_transcription_versions 
WHERE version_type = 'H-6';

-- Delete any corrections patterns that were created from H-6 (or any orphaned entries)
-- This is a safety measure since dictionary_corrections_applied should already be cleared
DELETE FROM max_transcription_correction_patterns 
WHERE id IN (
  SELECT DISTINCT p.id
  FROM max_transcription_correction_patterns p
  WHERE p.created_by NOT IN (
    SELECT DISTINCT edited_by 
    FROM max_transcription_versions 
    WHERE version_type != 'H-6'
  )
);

COMMIT;

-- Verify H-6 is gone
SELECT COUNT(*) as remaining_h6_versions 
FROM max_transcription_versions 
WHERE version_type = 'H-6';
-- Should return 0

