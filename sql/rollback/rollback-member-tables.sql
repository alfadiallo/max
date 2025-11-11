-- Rollback Script for Member Management Tables
-- Run this in Supabase SQL Editor to undo the member tables creation

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS email_change_trigger ON members;

-- Drop functions
DROP FUNCTION IF EXISTS sync_email_changes();
DROP FUNCTION IF EXISTS identify_missing_learnworlds_members();
DROP FUNCTION IF EXISTS find_potential_duplicate_members();

-- Drop views
DROP VIEW IF EXISTS active_members_view;

-- Drop indexes
DROP INDEX IF EXISTS idx_members_primary_email;
DROP INDEX IF EXISTS idx_members_stripe_customer_id;
DROP INDEX IF EXISTS idx_learnworlds_users_email;
DROP INDEX IF EXISTS idx_learnworlds_users_is_active;
DROP INDEX IF EXISTS idx_member_status_member_id;
DROP INDEX IF EXISTS idx_member_status_is_current;
DROP INDEX IF EXISTS idx_memberships_member_id;
DROP INDEX IF EXISTS idx_email_addresses_email;

-- Drop tables in reverse order (to avoid foreign key constraints)
DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS onboarding_surveys CASCADE;
DROP TABLE IF EXISTS member_attributes CASCADE;
DROP TABLE IF EXISTS email_addresses CASCADE;
DROP TABLE IF EXISTS learnworlds_users CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS member_status CASCADE;
DROP TABLE IF EXISTS members CASCADE;

COMMIT;

-- Verify cleanup
SELECT 
  'Tables cleaned up successfully' as status,
  COUNT(*) as remaining_member_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'members', 'member_status', 'memberships', 'learnworlds_users',
  'email_addresses', 'member_attributes', 'onboarding_surveys', 'survey_responses'
);

