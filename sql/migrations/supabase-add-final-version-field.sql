-- =====================================================
-- Add final_version_id to max_transcriptions
-- =====================================================
-- This allows us to track which version is marked as "Final"
-- =====================================================

ALTER TABLE max_transcriptions 
ADD COLUMN IF NOT EXISTS final_version_id UUID REFERENCES max_transcription_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_max_transcriptions_final_version ON max_transcriptions(final_version_id);

COMMENT ON COLUMN max_transcriptions.final_version_id IS 'The version_id (from max_transcription_versions) that has been promoted to Final';









