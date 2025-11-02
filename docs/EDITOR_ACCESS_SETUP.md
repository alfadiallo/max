# Editor Access Setup

## Overview
Editors have restricted access - they can only:
- Access `/projects` route
- View "Original Transcript" and "Edits" tabs
- Edit transcriptions
- Use Find & Replace

## Restrictions for Editors

### Route Access
- ✅ Can access: `/projects`, `/login`, `/register`, `/api/*`
- ❌ Cannot access: `/dashboard`, `/insight`, `/rag`, `/corrections`, `/admin/*`
- When accessing `/dashboard`, automatically redirected to `/projects`

### Transcription Tabs
- ✅ Can access: "Original Transcript", "Edits"
- ❌ Cannot access: "Final", "Analysis", "Translations"

### Actions
- ✅ Can: Edit transcriptions, Use Find & Replace, Transcribe audio
- ❌ Cannot: Promote to Final, Send for Analysis, Send to Insight, Manage users

## How Editors Login

1. **Editor receives invitation email** (from admin)
2. **Clicks link in email** → Sets password
3. **Redirected to `/projects`** (not `/dashboard`)
4. **Can start working immediately**

## Setup Steps

### 1. Set Editor Role
```sql
-- In Supabase SQL Editor
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "Editor"}'::jsonb
WHERE email = 'alfadiallo@mac.com';
```

### 2. Verify Editor Can Login
- Go to http://localhost:3000/login
- Login with alfadiallo@mac.com
- Should redirect to `/projects` (not `/dashboard`)

### 3. Test Restrictions
- Try accessing `/dashboard` → Should redirect to `/projects`
- Open a project → Should only see "Original Transcript" and "Edits" tabs
- Should NOT see "Promote to Final" button

## Current Implementation

### Middleware (`src/middleware.ts`)
- Redirects Editors from `/dashboard` to `/projects`
- Restricts Editors to only allowed routes

### TranscriptionView (`src/components/audio/TranscriptionView.tsx`)
- Hides Final, Analysis, Translations tabs for Editors
- Hides "Promote to Final" button for Editors
- Automatically resets activeTab if Editor tries to access restricted tab

## User Roles

| Role | Dashboard | Projects | All Tabs | Promote to Final | Manage Users |
|------|-----------|----------|----------|------------------|--------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editor | ❌ | ✅ | ❌ (Original, Edits only) | ❌ | ❌ |

