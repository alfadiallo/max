-- =====================================================
-- Diagnose Editor Access to Specific Project
-- =====================================================
-- Run this to check why Editor can't see project data
-- =====================================================

-- 1. Check Editor role is set
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data as metadata
FROM auth.users
WHERE email = 'alfadiallo@mac.com';

-- 2. Find the project ID
SELECT 
  id,
  name,
  created_by,
  archived,
  created_at
FROM max_projects
WHERE name LIKE '%Invisalign%' OR name LIKE '%Smile Architect%'
ORDER BY created_at DESC;

-- 3. Check what audio files exist for this project
-- Replace 'PROJECT_ID_HERE' with the actual project ID from step 2
SELECT 
  af.id,
  af.file_name,
  af.display_name,
  af.project_id,
  af.uploaded_by,
  af.created_at
FROM max_audio_files af
WHERE af.project_id IN (
  SELECT id FROM max_projects 
  WHERE name LIKE '%Invisalign%' OR name LIKE '%Smile Architect%'
)
ORDER BY af.created_at DESC;

-- 4. Check transcriptions
SELECT 
  t.id,
  t.audio_file_id,
  t.created_by,
  t.created_at,
  af.project_id,
  p.name as project_name
FROM max_transcriptions t
JOIN max_audio_files af ON af.id = t.audio_file_id
JOIN max_projects p ON p.id = af.project_id
WHERE p.name LIKE '%Invisalign%' OR p.name LIKE '%Smile Architect%'
ORDER BY t.created_at DESC;

-- 5. Verify is_editor_or_admin() function exists and works
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_editor_or_admin';

-- 6. Check all RLS policies for max_audio_files
SELECT 
  policyname, 
  cmd,
  qual 
FROM pg_policies 
WHERE tablename = 'max_audio_files'
ORDER BY policyname;

-- 7. Check all RLS policies for max_transcriptions
SELECT 
  policyname, 
  cmd,
  qual 
FROM pg_policies 
WHERE tablename = 'max_transcriptions'
ORDER BY policyname;

-- 8. Test if Editor can see projects (this will be filtered by RLS)
-- Get Editor user ID first
SELECT id as editor_user_id FROM auth.users WHERE email = 'alfadiallo@mac.com';

