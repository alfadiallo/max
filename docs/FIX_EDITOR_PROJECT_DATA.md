# Fix: Editor Not Seeing Project Data

## Step-by-Step Solution

### Step 1: Run the Complete Migration

Go to **Supabase Dashboard → SQL Editor** and run the entire file:
- `sql/migrations/supabase-allow-editors-all-projects-complete.sql`

This updates all RLS policies to allow Editors to access all data.

### Step 2: Verify Editor Role is Set

Run this SQL:

```sql
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "Editor"}'::jsonb
WHERE email = 'alfadiallo@mac.com';

-- Verify
SELECT email, raw_user_meta_data->>'role' as role 
FROM auth.users 
WHERE email = 'alfadiallo@mac.com';
```

Should show: `"Editor"`

### Step 3: Run Diagnostic Query

Run this SQL to see what data exists:

```sql
-- Find the project
SELECT id, name, created_by 
FROM max_projects 
WHERE name LIKE '%Invisalign%' OR name LIKE '%Smile Architect%';

-- Check audio files (replace PROJECT_ID with actual ID from above)
SELECT COUNT(*) as audio_count
FROM max_audio_files 
WHERE project_id = 'PROJECT_ID_HERE';

-- Check transcriptions
SELECT COUNT(*) as transcription_count
FROM max_transcriptions t
JOIN max_audio_files af ON af.id = t.audio_file_id
WHERE af.project_id = 'PROJECT_ID_HERE';
```

### Step 4: Log Out and Log Back In

1. Log out completely
2. Clear browser cache/cookies (optional but recommended)
3. Log back in as alfadiallo@mac.com
4. Go to `/projects`
5. Click on the project

### Step 5: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   - "Loading audio files for project: ..."
   - "Audio files loaded: X files"
   - Any error messages

### Step 6: If Still Not Working

Run this diagnostic SQL (in Supabase SQL Editor):

```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'is_editor_or_admin';

-- Check all policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('max_projects', 'max_audio_files', 'max_transcriptions', 'max_transcription_versions')
ORDER BY tablename, policyname;

-- Verify Editor can theoretically see data
SELECT 
  p.name,
  COUNT(af.id) as audio_files,
  COUNT(t.id) as transcriptions
FROM max_projects p
LEFT JOIN max_audio_files af ON af.project_id = p.id
LEFT JOIN max_transcriptions t ON t.audio_file_id = af.id
WHERE p.name LIKE '%Invisalign%' OR p.name LIKE '%Smile Architect%'
GROUP BY p.id, p.name;
```

## Common Issues

### Issue 1: Policies not applied
**Solution:** Make sure you ran the COMPLETE migration file, not just parts of it.

### Issue 2: Editor role not set
**Solution:** Run Step 2 above to set the role.

### Issue 3: Browser cache
**Solution:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) or clear cache.

### Issue 4: Still logged in as different user
**Solution:** Make sure you're logged in as alfadiallo@mac.com, not findme@alfadiallo.com

## What Should Work After These Steps

✅ Editor can see all projects in `/projects`
✅ Editor can click on any project and see:
  - Project details
  - Audio files
  - Transcriptions
  - Can edit transcriptions
  - Can see transcription versions

## Still Not Working?

Check the browser console for specific error messages and share them. The errors will tell us exactly which table is blocking access.

