-- =====================================================
-- Debug: Check User Roles in Supabase Auth
-- =====================================================
-- Run this in Supabase SQL Editor to see current users and roles
-- =====================================================

-- Show all users with their metadata (including roles)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role,
  raw_app_meta_data as app_metadata,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Show max_users table
SELECT 
  id,
  email,
  full_name,
  created_at,
  updated_at
FROM max_users
ORDER BY created_at DESC;

-- Find discrepancies between auth.users and max_users
SELECT 
  CASE 
    WHEN au.id IS NULL THEN 'In max_users but NOT in auth.users'
    WHEN mu.id IS NULL THEN 'In auth.users but NOT in max_users'
    ELSE 'In both tables'
  END as status,
  COALESCE(au.email, mu.email) as email,
  au.raw_user_meta_data->>'role' as auth_role,
  au.raw_user_meta_data->>'full_name' as auth_name,
  mu.full_name as max_name
FROM auth.users au
FULL OUTER JOIN max_users mu ON au.id = mu.id
ORDER BY status, COALESCE(au.created_at, mu.created_at) DESC;

