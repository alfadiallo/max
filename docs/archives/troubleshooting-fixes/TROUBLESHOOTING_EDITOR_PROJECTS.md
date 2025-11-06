# Troubleshooting: Editor Not Seeing Projects

## Issue
Editor (alfadiallo@mac.com) cannot see existing projects.

## Steps to Debug

### 1. Check Browser Console
Open browser DevTools (F12) → Console tab and look for:
- Error messages about RLS policies
- Messages showing user role and whether they're detected as Editor
- Messages showing how many projects were loaded

### 2. Verify User Role in Database
Run this SQL in Supabase SQL Editor:

```sql
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
WHERE email = 'alfadiallo@mac.com';
```

**Expected:** `role` should be `"Editor"` or `"editor"`

**If missing or null:**
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "Editor"}'::jsonb
WHERE email = 'alfadiallo@mac.com';
```

### 3. Check RLS Policies
Run this SQL to see current policies:

```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'max_projects'
ORDER BY policyname;
```

**Should see:** Policies that include `is_editor_or_admin()` or check for Editor role

**If not:** Run the migration:
```sql
-- Run: sql/migrations/supabase-allow-editors-all-projects-complete.sql
```

### 4. Check if Function Exists
```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_editor_or_admin';
```

**If it doesn't exist:** The migration wasn't run completely. Run it again.

### 5. Test Direct Query
Try querying as the Editor user:

```sql
-- First get the user ID
SELECT id FROM auth.users WHERE email = 'alfadiallo@mac.com';

-- Then check projects (replace USER_ID with the actual UUID)
SELECT COUNT(*) FROM max_projects WHERE archived = false;
```

### 6. Check Projects Exist
```sql
SELECT 
  id,
  name,
  created_by,
  archived
FROM max_projects
WHERE archived = false;
```

**If no projects:** Projects need to be created first.

**If projects exist but Editor can't see them:** RLS policies need to be updated.

## Quick Fix Checklist

- [ ] User role is set to "Editor" in `auth.users.raw_user_meta_data`
- [ ] `is_editor_or_admin()` function exists in database
- [ ] RLS policies on `max_projects` include Editor check
- [ ] Projects exist in `max_projects` table
- [ ] Projects are not archived (`archived = false`)
- [ ] Browser console shows no errors
- [ ] User is logged in as alfadiallo@mac.com

## Most Common Issue

**RLS policies haven't been updated.** 

Run the complete migration:
```sql
-- File: sql/migrations/supabase-allow-editors-all-projects-complete.sql
```

This creates the `is_editor_or_admin()` function and updates all RLS policies to allow Editors to see all projects.

