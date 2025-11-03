-- =====================================================
-- Fix Transcription UPDATE Policy for Editors
-- =====================================================
-- Allow Editors to update transcriptions (to set final_version_id)
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

-- Drop existing UPDATE policies on max_transcriptions
DROP POLICY IF EXISTS "Users can update their transcriptions" ON max_transcriptions;
DROP POLICY IF EXISTS "Allow users to update their transcriptions or Editors/Admins can update all" ON max_transcriptions;

-- Create new UPDATE policy that allows Editors to update all transcriptions
CREATE POLICY "Allow users to update their transcriptions or Editors/Admins can update all" 
ON max_transcriptions 
FOR UPDATE 
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
)
WITH CHECK (
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

-- Verify the policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'max_transcriptions' AND cmd = 'UPDATE'
ORDER BY policyname;

