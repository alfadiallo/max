-- =====================================================
-- Fix Transcription RLS Policies for Editors
-- =====================================================
-- This ensures Editors can see ALL transcriptions, not just their own
-- =====================================================

-- First, make sure the helper function exists
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
-- Fix max_transcriptions policies
-- =====================================================

-- Drop all existing transcription policies
DROP POLICY IF EXISTS "Users can view transcriptions for their audio files" ON max_transcriptions;
DROP POLICY IF EXISTS "Users can view transcriptions for their audio files or Editors can view all" ON max_transcriptions;
DROP POLICY IF EXISTS "Users can create transcriptions" ON max_transcriptions;

-- Create new policy that allows Editors to see ALL transcriptions
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

-- Keep the create policy
CREATE POLICY IF NOT EXISTS "Users can create transcriptions" 
ON max_transcriptions 
FOR INSERT 
WITH CHECK (auth.uid() = created_by OR is_editor_or_admin());

-- =====================================================
-- Fix max_transcription_versions policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view transcription versions" ON max_transcription_versions;
DROP POLICY IF EXISTS "Users can view transcription versions or Editors can view all" ON max_transcription_versions;
DROP POLICY IF EXISTS "Users can create transcription versions" ON max_transcription_versions;
DROP POLICY IF EXISTS "Users can create transcription versions or Editors can create for all" ON max_transcription_versions;

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

CREATE POLICY "Users can create transcription versions or Editors can create for all" 
ON max_transcription_versions 
FOR INSERT 
WITH CHECK (
  auth.uid() = edited_by
  OR
  is_editor_or_admin()
);

-- =====================================================
-- Verify
-- =====================================================

SELECT 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename IN ('max_transcriptions', 'max_transcription_versions')
ORDER BY tablename, policyname;

