-- =====================================================
-- Add final_version_id to max_translations
-- =====================================================
-- This allows us to track which translation version is marked as "Final"
-- =====================================================

ALTER TABLE max_translations 
ADD COLUMN IF NOT EXISTS final_version_id UUID REFERENCES max_translation_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_max_translations_final_version ON max_translations(final_version_id);

COMMENT ON COLUMN max_translations.final_version_id IS 'The version_id (from max_translation_versions) that has been promoted to Final';









