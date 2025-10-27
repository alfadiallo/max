-- =====================================================
-- Add DELETE RLS Policies for Max
-- =====================================================
-- This allows users to delete their own data
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete their audio files" ON max_audio_files;
DROP POLICY IF EXISTS "Users can delete transcriptions" ON max_transcriptions;
DROP POLICY IF EXISTS "Users can delete transcription versions" ON max_transcription_versions;

-- max_audio_files: Users can delete their own audio files
CREATE POLICY "Users can delete their audio files" 
ON max_audio_files 
FOR DELETE 
USING (auth.uid() = uploaded_by);

-- max_transcriptions: Users can delete transcriptions for their audio files
CREATE POLICY "Users can delete transcriptions" 
ON max_transcriptions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM max_audio_files 
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_audio_files.id = max_transcriptions.audio_file_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- max_transcription_versions: Users can delete versions for their transcriptions
CREATE POLICY "Users can delete transcription versions" 
ON max_transcription_versions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_transcription_versions.transcription_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- =====================================================
-- Done!
-- =====================================================

