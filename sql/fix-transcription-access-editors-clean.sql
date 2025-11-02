-- =====================================================
-- Fix Transcription Access for Editors - CLEAN VERSION
-- =====================================================
-- This ensures Editors can see ALL transcriptions
-- =====================================================

-- Make sure function exists
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

-- Drop ALL existing policies on max_transcriptions
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'max_transcriptions') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON max_transcriptions';
  END LOOP;
END $$;

-- Create SELECT policy - allows Editors to see ALL transcriptions
CREATE POLICY "Allow users to view their transcriptions or Editors/Admins view all" 
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

-- Create INSERT policy
CREATE POLICY "Allow users to create transcriptions" 
ON max_transcriptions 
FOR INSERT 
WITH CHECK (auth.uid() = created_by OR is_editor_or_admin());

-- =====================================================
-- Fix max_transcription_versions policies
-- =====================================================

-- Drop ALL existing policies on max_transcription_versions
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'max_transcription_versions') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON max_transcription_versions';
  END LOOP;
END $$;

-- Create SELECT policy - allows Editors to see ALL versions
CREATE POLICY "Allow users to view their transcription versions or Editors/Admins view all" 
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
    AND (max_projects.created_by = auth.uid() OR is_editor_or_admin())
  )
  OR
  is_editor_or_admin()
);

-- Create INSERT policy
CREATE POLICY "Allow users to create transcription versions or Editors/Admins create for all" 
ON max_transcription_versions 
FOR INSERT 
WITH CHECK (
  auth.uid() = edited_by
  OR
  is_editor_or_admin()
);

-- =====================================================
-- Verify policies
-- =====================================================

SELECT 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename IN ('max_transcriptions', 'max_transcription_versions')
ORDER BY tablename, policyname;

