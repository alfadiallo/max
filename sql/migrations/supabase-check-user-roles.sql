-- =====================================================
-- Check Current User Roles in Supabase Auth
-- =====================================================
-- This query shows which users exist and their roles
-- Run this in Supabase SQL Editor
-- =====================================================

-- Check auth.users table for user metadata (roles)
SELECT 
  id,
  email,
  raw_user_meta_data as user_metadata,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Check max_users table
SELECT 
  id,
  email,
  full_name,
  created_at,
  updated_at
FROM max_users
ORDER BY created_at DESC;

-- Find users who exist in auth but not in max_users
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as name_from_auth,
  au.raw_user_meta_data->>'role' as role_from_auth
FROM auth.users au
LEFT JOIN max_users mu ON au.id = mu.id
WHERE mu.id IS NULL;

