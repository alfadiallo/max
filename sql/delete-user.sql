-- =====================================================
-- Delete User from Supabase
-- =====================================================
-- WARNING: This will delete the user from both auth.users and max_users
-- =====================================================

-- Method 1: Using Supabase Dashboard (Recommended)
-- 1. Go to: https://app.supabase.com/project/sutzvbpsflwqdzcjtscr/auth/users
-- 2. Find alfadiallo@mac.com
-- 3. Click the three dots (⋯) menu
-- 4. Click "Delete user"
-- 5. Confirm deletion
-- 
-- This will automatically cascade delete from max_users due to ON DELETE CASCADE

-- Method 2: Using SQL (if you have admin access)
-- First, delete from max_users (if it exists)
DELETE FROM max_users WHERE email = 'alfadiallo@mac.com';

-- Then delete from auth.users (requires service role or admin access)
-- Note: This may not work via SQL Editor if RLS is enabled
DELETE FROM auth.users WHERE email = 'alfadiallo@mac.com';

-- Verify deletion
SELECT email, id FROM auth.users WHERE email = 'alfadiallo@mac.com';
SELECT email, id FROM max_users WHERE email = 'alfadiallo@mac.com';

