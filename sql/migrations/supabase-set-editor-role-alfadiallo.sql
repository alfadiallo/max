-- =====================================================
-- Set Editor Role for alfadiallo@mac.com
-- =====================================================

-- Set the Editor role for alfadiallo@mac.com
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "Editor"}'::jsonb
WHERE email = 'alfadiallo@mac.com';

-- Verify the update
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data as full_metadata
FROM auth.users
WHERE email = 'alfadiallo@mac.com';

