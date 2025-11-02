-- =====================================================
-- Fix User Metadata for Admin Role and Full Names
-- =====================================================
-- Run this to fix the missing metadata
-- =====================================================

-- Set Admin role for findme@alfadiallo.com
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "Admin"}'::jsonb
WHERE email = 'findme@alfadiallo.com';

-- Set full_name for alfadiallo@mac.com (if needed)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"full_name": "Alfa Diallo"}'::jsonb
WHERE email = 'alfadiallo@mac.com' AND raw_user_meta_data->'full_name' IS NULL;

-- Verify the updates
SELECT 
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data as full_metadata
FROM auth.users
ORDER BY email;

