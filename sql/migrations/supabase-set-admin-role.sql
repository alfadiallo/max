-- =====================================================
-- Set Admin Role for Existing User
-- =====================================================
-- Run this to set the Admin role for findme@alfadiallo.com
-- =====================================================

-- Method 1: Using Supabase Dashboard (Recommended)
-- Go to: Authentication > Users > findme@alfadiallo.com > Edit
-- In User Metadata field, add: {"role": "Admin", "full_name": "Your Name"}

-- Method 2: Using SQL (alternative - may not work if RLS is enabled)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "Admin"}'::jsonb
WHERE email = 'findme@alfadiallo.com';

-- Verify the update
SELECT 
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'findme@alfadiallo.com';

