-- =====================================================
-- Debug Editor Access to Projects
-- =====================================================
-- Run this to check if Editor can access projects
-- =====================================================

-- 1. Check if the user exists and has Editor role
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'alfadiallo@mac.com';

-- 2. Check what projects exist
SELECT 
  id,
  name,
  created_by,
  created_at
FROM max_projects
WHERE archived = false
ORDER BY created_at DESC;

-- 3. Check current RLS policies on max_projects
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'max_projects'
ORDER BY policyname;

-- 4. Check if is_editor_or_admin() function exists
SELECT 
  proname, 
  prosrc 
FROM pg_proc 
WHERE proname = 'is_editor_or_admin';

-- 5. Test the function manually (replace with actual user ID)
-- Get the user ID first:
SELECT id FROM auth.users WHERE email = 'alfadiallo@mac.com';
-- Then test (replace 'USER_ID_HERE' with the actual UUID):
-- SELECT is_editor_or_admin(); -- This will run as the current auth.uid()

-- 6. Check if user is in max_users table
SELECT * FROM max_users WHERE email = 'alfadiallo@mac.com';

