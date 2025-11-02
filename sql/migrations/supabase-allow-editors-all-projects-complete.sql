-- =====================================================
-- Allow Editors to View and Work on All Projects
-- =====================================================
-- Editors should be able to see and work on all projects,
-- not just the ones they created. This updates RLS policies
-- to allow Editors access to all projects and related data.
-- =====================================================

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

-- =====================================================
-- max_projects: Allow Editors to view and update all projects
-- =====================================================

-- Drop existing restrictive policies (both old and new names)
DROP POLICY IF EXISTS "Users can view their own projects" ON max_projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON max_projects;
DROP POLICY IF EXISTS "Users can view their own projects or Editors can view all" ON max_projects;
DROP POLICY IF EXISTS "Users can update their own projects or Editors can update all" ON max_projects;

-- Create new policies that allow Editors to view/update all projects
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

-- =====================================================
-- max_audio_files: Allow Editors to view audio files for all projects
-- =====================================================

DROP POLICY IF EXISTS "Users can view audio files for their projects" ON max_audio_files;
DROP POLICY IF EXISTS "Users can update their audio files" ON max_audio_files;
DROP POLICY IF EXISTS "Users can view audio files for their projects or Editors can view all" ON max_audio_files;
DROP POLICY IF EXISTS "Users can update their audio files or Editors can update all" ON max_audio_files;

CREATE POLICY "Users can view audio files for their projects or Editors can view all" 
ON max_audio_files 
FOR SELECT 
USING (
  auth.uid() = uploaded_by
  OR
  EXISTS (
    SELECT 1 FROM max_projects 
    WHERE max_projects.id = max_audio_files.project_id 
    AND max_projects.created_by = auth.uid()
  )
  OR
  is_editor_or_admin()
);

CREATE POLICY "Users can update their audio files or Editors can update all" 
ON max_audio_files 
FOR UPDATE 
USING (
  auth.uid() = uploaded_by
  OR
  is_editor_or_admin()
);

-- =====================================================
-- max_transcriptions: Allow Editors to view transcriptions for all projects
-- =====================================================

DROP POLICY IF EXISTS "Users can view transcriptions for their audio files" ON max_transcriptions;
DROP POLICY IF EXISTS "Users can view transcriptions for their audio files or Editors can view all" ON max_transcriptions;

CREATE POLICY "Users can view transcriptions for their audio files or Editors can view all" 
ON max_transcriptions 
FOR SELECT 
USING (
  auth.uid() = created_by
  OR
  EXISTS (
    SELECT 1 FROM max_audio_files 
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_audio_files.id = max_transcriptions.audio_file_id 
    AND max_projects.created_by = auth.uid()
  )
  OR
  is_editor_or_admin()
);

-- =====================================================
-- max_transcription_versions: Allow Editors to view and create versions for all projects
-- =====================================================

DROP POLICY IF EXISTS "Users can view transcription versions" ON max_transcription_versions;
DROP POLICY IF EXISTS "Users can view transcription versions or Editors can view all" ON max_transcription_versions;

CREATE POLICY "Users can view transcription versions or Editors can view all" 
ON max_transcription_versions 
FOR SELECT 
USING (
  auth.uid() = edited_by
  OR
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_transcription_versions.transcription_id 
    AND max_projects.created_by = auth.uid()
  )
  OR
  is_editor_or_admin()
);

-- Allow Editors to create transcription versions
DROP POLICY IF EXISTS "Users can create transcription versions" ON max_transcription_versions;
DROP POLICY IF EXISTS "Users can create transcription versions or Editors can create for all" ON max_transcription_versions;

CREATE POLICY "Users can create transcription versions or Editors can create for all" 
ON max_transcription_versions 
FOR INSERT 
WITH CHECK (
  auth.uid() = edited_by
  OR
  is_editor_or_admin()
);

-- =====================================================
-- max_translations: Allow Editors to view translations for all projects
-- =====================================================

DROP POLICY IF EXISTS "Users can view translations" ON max_translations;
DROP POLICY IF EXISTS "Users can view translations or Editors can view all" ON max_translations;

CREATE POLICY "Users can view translations or Editors can view all" 
ON max_translations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_translations.transcription_id 
    AND max_projects.created_by = auth.uid()
  )
  OR
  is_editor_or_admin()
);

-- =====================================================
-- max_translation_versions: Allow Editors to view translation versions for all projects
-- =====================================================

DROP POLICY IF EXISTS "Users can view translation versions" ON max_translation_versions;
DROP POLICY IF EXISTS "Users can view translation versions or Editors can view all" ON max_translation_versions;

CREATE POLICY "Users can view translation versions or Editors can view all" 
ON max_translation_versions 
FOR SELECT 
USING (
  auth.uid() = edited_by
  OR
  EXISTS (
    SELECT 1 FROM max_translations 
    JOIN max_transcriptions ON max_transcriptions.id = max_translations.transcription_id
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_translations.id = max_translation_versions.translation_id 
    AND max_projects.created_by = auth.uid()
  )
  OR
  is_editor_or_admin()
);

-- Allow Editors to create translation versions
DROP POLICY IF EXISTS "Users can create translation versions" ON max_translation_versions;
DROP POLICY IF EXISTS "Users can create translation versions or Editors can create for all" ON max_translation_versions;

CREATE POLICY "Users can create translation versions or Editors can create for all" 
ON max_translation_versions 
FOR INSERT 
WITH CHECK (
  auth.uid() = edited_by
  OR
  is_editor_or_admin()
);

-- =====================================================
-- Verify the policies
-- =====================================================

SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename LIKE 'max_%'
ORDER BY tablename, policyname;

