-- =====================================================
-- Add Sonix Integration Support
-- Version: 2.0.0
-- =====================================================

-- =====================================================
-- 1. Extend max_audio_files for Sonix support
-- =====================================================

-- Add Sonix-related fields
ALTER TABLE max_audio_files
ADD COLUMN IF NOT EXISTS sonix_media_id TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'audio' CHECK (file_type IN ('audio', 'video')),
ADD COLUMN IF NOT EXISTS sonix_status TEXT;

-- Create index for Sonix media ID lookups
CREATE INDEX IF NOT EXISTS idx_max_audio_files_sonix_media_id 
ON max_audio_files(sonix_media_id) 
WHERE sonix_media_id IS NOT NULL;

-- =====================================================
-- 2. Extend max_transcriptions for source tracking
-- =====================================================

-- Add source field to track transcription service
ALTER TABLE max_transcriptions
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'whisper' CHECK (source IN ('whisper', 'sonix'));

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_max_transcriptions_source 
ON max_transcriptions(source);

-- Add final_version_id if it doesn't exist (for backward compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'max_transcriptions' 
    AND column_name = 'final_version_id'
  ) THEN
    ALTER TABLE max_transcriptions
    ADD COLUMN final_version_id UUID REFERENCES max_transcription_versions(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_max_transcriptions_final_version 
    ON max_transcriptions(final_version_id);
  END IF;
END $$;

-- =====================================================
-- 3. Comments for documentation
-- =====================================================

COMMENT ON COLUMN max_audio_files.sonix_media_id IS 'Reference to Sonix media ID for imported videos';
COMMENT ON COLUMN max_audio_files.file_type IS 'Type of file: audio or video';
COMMENT ON COLUMN max_audio_files.sonix_status IS 'Sync status with Sonix (optional)';
COMMENT ON COLUMN max_transcriptions.source IS 'Transcription service: whisper or sonix';

-- =====================================================
-- Success!
-- =====================================================

-- ✅ Sonix integration schema updates completed
-- 📊 New columns added to max_audio_files and max_transcriptions
-- 📋 Indexes created for performance

