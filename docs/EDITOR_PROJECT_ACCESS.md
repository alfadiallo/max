# Editor Access to All Projects - Setup Guide

## Problem
Editors (like alfadiallo@mac.com) cannot see existing projects because:
1. The code filters projects by `created_by = user.id`
2. RLS policies restrict access to only projects created by the user

## Solution

### Step 1: Update RLS Policies in Supabase

Run this SQL migration in Supabase SQL Editor:
```sql
-- File: sql/migrations/supabase-allow-editors-all-projects-complete.sql
```

Or manually:

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run this SQL**:

```sql
-- Helper function to check if user is Editor or Admin
CREATE OR REPLACE FUNCTION is_editor_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (raw_user_meta_data->>'role') IN ('Editor', 'editor', 'Admin', 'admin'),
      false
    )
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update max_projects policies
DROP POLICY IF EXISTS "Users can view their own projects" ON max_projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON max_projects;

CREATE POLICY "Users can view their own projects or Editors can view all" 
ON max_projects 
FOR SELECT 
USING (
  auth.uid() = created_by 
  OR 
  is_editor_or_admin()
);

CREATE POLICY "Users can update their own projects or Editors can update all" 
ON max_projects 
FOR UPDATE 
USING (
  auth.uid() = created_by 
  OR 
  is_editor_or_admin()
);
```

3. **Update related tables** (audio files, transcriptions, etc.) using the complete migration file.

### Step 2: Code Already Updated ✅

The code has been updated to:
- Remove `created_by` filter for Editors in `src/app/projects/page.tsx`
- Remove `created_by` filter for Editors in `src/app/api/projects/route.ts`

### Step 3: Verify

After running the SQL:
1. Login as Editor (alfadiallo@mac.com)
2. Go to `/projects`
3. You should see ALL projects, not just ones you created

## What Changed

### Code Changes:
- ✅ `src/app/projects/page.tsx` - Editors see all projects
- ✅ `src/app/api/projects/route.ts` - API returns all projects for Editors

### Database Changes (Required):
- ⚠️ **Run the SQL migration** to update RLS policies
- This allows Editors to bypass `created_by` restrictions

## After Migration

Editors will be able to:
- ✅ View ALL projects
- ✅ View ALL audio files
- ✅ View ALL transcriptions
- ✅ Edit transcriptions for any project
- ✅ Create transcription versions for any project

Regular users still only see their own projects.

