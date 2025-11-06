-- Add source_transcription_version_id and is_archived to max_translations
-- This tracks which English H-version was used to generate each translation
-- and marks outdated translations when source version changes

-- Add source_transcription_version_id column
ALTER TABLE max_translations 
ADD COLUMN IF NOT EXISTS source_transcription_version_id UUID REFERENCES max_transcription_versions(id) ON DELETE SET NULL;

-- Add is_archived column
ALTER TABLE max_translations 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create index for source version queries
CREATE INDEX IF NOT EXISTS idx_max_translations_source_version ON max_translations(source_transcription_version_id);

-- Create index for archival status queries
CREATE INDEX IF NOT EXISTS idx_max_translations_archived ON max_translations(is_archived) WHERE is_archived = FALSE;

-- Add comments
COMMENT ON COLUMN max_translations.source_transcription_version_id IS 'The English H-version (from max_transcription_versions) that was used as the source for this translation. NULL means T-1 was used.';
COMMENT ON COLUMN max_translations.is_archived IS 'True if this translation is outdated (based on an old H-version that has been superseded by a newer version marked as "Ready to Translate")';

