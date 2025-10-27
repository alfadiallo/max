-- =====================================================
-- Fix Transcription RLS Policy
-- =====================================================
-- The INSERT policy was too permissive - it needs to validate
-- that the user owns the audio file before allowing insertion
-- =====================================================

-- Drop the existing too-permissive INSERT policy
DROP POLICY IF EXISTS "Users can create transcriptions" ON max_transcriptions;

-- Create a better INSERT policy that validates audio file ownership
CREATE POLICY "Users can create transcriptions" 
ON max_transcriptions FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM max_audio_files 
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_audio_files.id = max_transcriptions.audio_file_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- Also need UPDATE policy for when final_version_id is set
CREATE POLICY "Users can update their transcriptions" 
ON max_transcriptions FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM max_audio_files 
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_audio_files.id = max_transcriptions.audio_file_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'max_transcriptions'
ORDER BY policyname;

