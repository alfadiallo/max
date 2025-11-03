-- =====================================================
-- Debug: Check Admin Role in Supabase Auth
-- =====================================================
-- Run this in Supabase SQL Editor to check user roles
-- =====================================================

-- Show all users with their metadata (especially roles)
SELECT 
  id,
  email,
  raw_user_meta_data as user_metadata,
  raw_app_meta_data as app_metadata,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Specific check for admin user
SELECT 
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data as full_metadata
FROM auth.users
WHERE email = 'findme@alfadiallo.com';

-- Check if role exists at all
SELECT 
  email,
  raw_user_meta_data,
  CASE 
    WHEN raw_user_meta_data ? 'role' THEN 'Has role field'
    ELSE 'NO role field'
  END as role_check
FROM auth.users;

