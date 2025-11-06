# Recent Changes - Editor Access, File Upload, & Corrections Display

## Date: Latest Session

### 🔧 Latest Fix: Corrections Display Optimization

#### Corrections Show Minimal Diff Instead of Full Segments
- **Problem**: Corrections page showed entire segment text even for single-word corrections (e.g., "Carla" → "Karla" showed the entire sentence)
- **Solution**:
  - Created `src/lib/utils/textDiff.ts` utility to compute minimal text differences
  - Updated `TranscriptionView.tsx` to use `computeTextDiff` when saving new versions
  - Created admin API endpoint `/api/admin/fix-corrections` to reprocess existing corrections
  - Fixed relationship ambiguity in Supabase queries by using separate queries instead of nested selects
- **Result**: Corrections now show only changed words with context (2 words before/after by default)
- **Files**:
  - `src/lib/utils/textDiff.ts` - New utility for computing minimal diffs
  - `src/components/audio/TranscriptionView.tsx` - Updated to use text diff when saving
  - `src/app/api/admin/fix-corrections/route.ts` - Admin endpoint to fix existing corrections
  - `docs/FIX_CORRECTIONS_INSTRUCTIONS.md` - Instructions for using the fix endpoint

### 🔧 Previous Fixes

### 🔧 Fixed Issues

#### 1. Header User Profile Display
- **Problem**: User name wasn't showing in the header after login
- **Solution**: 
  - Added auth state change listener in `Header.tsx`
  - Added error handling for authentication
  - Added loading state with "Loading..." indicator
  - Header now automatically updates when user logs in/out
  - Moved profile popup from dashboard to global header component

#### 2. File Upload Type Validation
- **Problem**: Uploads failing with "Invalid file type" error for valid audio files
- **Solution**:
  - Expanded MIME type list to include common variations:
    - MP3: `audio/mpeg`, `audio/mp3`, `audio/x-mpeg-3`, etc.
    - WAV: `audio/wav`, `audio/wave`, `audio/x-wav`, etc.
    - M4A/AAC: `audio/mp4`, `audio/m4a`, `audio/aac`, etc.
    - Plus WebM, OGG, and FLAC
  - Added file extension fallback validation
  - Improved error messages to show detected MIME type and extension

#### 3. Foreign Key Constraint Error on Upload
- **Problem**: `max_audio_files.uploaded_by` foreign key constraint violation
- **Root Cause**: User exists in `auth.users` but not in `max_users` table
- **Solution**:
  - Added automatic user sync before file upload
  - Uses admin client to upsert user into `max_users` table
  - Ensures users created via Auth are automatically synced to `max_users`

#### 4. Editor Access to Upload Files
- **Problem**: Editors couldn't upload files to projects they didn't create
- **Solution**:
  - Updated `/api/audio/upload` to check user role
  - Editors and Admins can now upload to any project
  - Regular users can only upload to their own projects

### 📝 Files Modified

#### New Files
- `src/lib/utils/textDiff.ts` - Text diffing utility for minimal corrections display
- `src/app/api/admin/fix-corrections/route.ts` - Admin API to reprocess corrections
- `docs/FIX_CORRECTIONS_INSTRUCTIONS.md` - Instructions for fixing corrections
- `sql/fix-corrections-for-audio.sql` - SQL helper for manual corrections fix

#### Frontend Components
- `src/components/Header.tsx` - Global user profile popup, auth state listener
- `src/components/audio/AudioPlayer.tsx` - Dark mode improvements
- `src/components/audio/TranscriptionView.tsx` - Editor tab restrictions, dark mode

#### API Routes
- `src/app/api/audio/upload/route.ts` - File type validation, user sync, Editor access
- `src/app/api/projects/route.ts` - Editor access to all projects
- `src/app/projects/[id]/page.tsx` - Editor access to all projects and audio files

#### Authentication & Middleware
- `src/middleware.ts` - Editor route restrictions
- `src/app/login/page.tsx` - Editor redirect to `/projects`

### 🎯 Key Features

#### Editor Role Capabilities
- ✅ Can view all projects (not just their own)
- ✅ Can view all audio files in all projects
- ✅ Can upload files to any project
- ✅ Can view transcriptions for all projects
- ✅ Can access only "Original Transcripts" and "Edits" tabs
- ✅ Cannot access "Final", "Analysis", or "Translations" tabs
- ✅ Cannot access `/dashboard`, `/insight`, `/rag`, `/admin`
- ✅ Redirected to `/projects` after login

#### Admin Role Capabilities
- ✅ All Editor capabilities
- ✅ Access to `/dashboard`, `/insight`, `/rag`, `/admin`
- ✅ Can invite new users via Admin Dashboard
- ✅ Can manage all projects and data

### 📚 Related Documentation

- `docs/HOW_TO_ADD_USER.md` - How to add new users (Admin vs Editor)
- `docs/EDITOR_PROJECT_ACCESS.md` - Editor access implementation details
- `docs/EMAIL_SETUP.md` - Email configuration for user invitations
- `docs/ADMIN_INVITE_SETUP.md` - Admin dashboard user invitation setup

### 🔄 Database Changes

- RLS policies updated to allow Editors to view all projects
- `is_editor_or_admin()` helper function used in RLS policies
- Policies updated for: `max_projects`, `max_audio_files`, `max_transcriptions`, `max_transcription_versions`

### ⚠️ Important Notes

1. **User Sync**: Users must exist in `max_users` table for foreign key constraints to work
   - Users created via Admin Dashboard are automatically synced
   - Users created directly in Supabase Auth need manual sync or will be auto-synced on first upload
   
2. **File Type Validation**: Now accepts multiple MIME type variations for the same format
   - If upload still fails, check console for detected MIME type
   - File extension is used as fallback validation

3. **Email Delivery**: User invitation emails require SMTP configuration in Supabase Dashboard
   - See `docs/EMAIL_SETUP.md` for configuration instructions
   - If SMTP not configured, share invite link manually

