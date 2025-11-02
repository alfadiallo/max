-- =====================================================
-- Verify Editor Can Access All Data
-- =====================================================
-- Run this to check if RLS policies allow Editor access
-- =====================================================

-- 1. Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_editor_or_admin';

-- 2. Check current policies for max_projects
SELECT 
  policyname, 
  cmd,
  qual 
FROM pg_policies 
WHERE tablename = 'max_projects'
ORDER BY policyname;

-- 3. Check current policies for max_audio_files
SELECT 
  policyname, 
  cmd,
  qual 
FROM pg_policies 
WHERE tablename = 'max_audio_files'
ORDER BY policyname;

-- 4. Check current policies for max_transcriptions
SELECT 
  policyname, 
  cmd,
  qual 
FROM pg_policies 
WHERE tablename = 'max_transcriptions'
ORDER BY policyname;

-- 5. Check if Editor role is set
SELECT 
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'alfadiallo@mac.com';

-- 6. Count projects (should see all if Editor)
-- This will be restricted by RLS, so run it as the Editor user
SELECT COUNT(*) as total_projects FROM max_projects WHERE archived = false;

-- 7. Check what data exists for a specific project
-- Replace 'PROJECT_ID_HERE' with actual project ID
SELECT 
  p.id as project_id,
  p.name as project_name,
  COUNT(DISTINCT af.id) as audio_files_count,
  COUNT(DISTINCT t.id) as transcriptions_count
FROM max_projects p
LEFT JOIN max_audio_files af ON af.project_id = p.id
LEFT JOIN max_transcriptions t ON t.audio_file_id = af.id
WHERE p.name LIKE '%Invisalign%' OR p.name LIKE '%Smile Architect%'
GROUP BY p.id, p.name;

