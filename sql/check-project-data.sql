-- =====================================================
-- Check Data for Project: 1 - Introduction to Invisalign...
-- =====================================================
-- Replace PROJECT_ID with: 00db0f1e-5f81-4e0e-a6db-765835a301b9
-- =====================================================

-- 1. Check the project
SELECT 
  id,
  name,
  created_by,
  archived
FROM max_projects
WHERE id = '00db0f1e-5f81-4e0e-a6db-765835a301b9';

-- 2. Check audio files for this project
SELECT 
  af.id,
  af.file_name,
  af.display_name,
  af.project_id,
  af.uploaded_by,
  af.created_at
FROM max_audio_files af
WHERE af.project_id = '00db0f1e-5f81-4e0e-a6db-765835a301b9'
ORDER BY af.created_at DESC;

-- 3. Check transcriptions for these audio files
SELECT 
  t.id,
  t.audio_file_id,
  t.raw_text,
  t.transcription_type,
  t.created_by,
  t.created_at,
  af.file_name
FROM max_transcriptions t
JOIN max_audio_files af ON af.id = t.audio_file_id
WHERE af.project_id = '00db0f1e-5f81-4e0e-a6db-765835a301b9'
ORDER BY t.created_at DESC;

-- 4. Check transcription versions
SELECT 
  tv.id,
  tv.transcription_id,
  tv.version_number,
  tv.version_type,
  tv.edited_text,
  tv.edited_by,
  tv.created_at,
  t.audio_file_id,
  af.file_name
FROM max_transcription_versions tv
JOIN max_transcriptions t ON t.id = tv.transcription_id
JOIN max_audio_files af ON af.id = t.audio_file_id
WHERE af.project_id = '00db0f1e-5f81-4e0e-a6db-765835a301b9'
ORDER BY tv.created_at DESC;

