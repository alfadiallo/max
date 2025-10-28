-- =====================================================
-- Add Edit Tracking to English Transcriptions
-- =====================================================
-- This migration adds the ability to track all word-level
-- edits made to the original Whisper transcription
-- =====================================================

-- Add dictionary_corrections_applied column to max_transcription_versions
-- This will store all the edits made to the English transcription
ALTER TABLE max_transcription_versions 
ADD COLUMN IF NOT EXISTS dictionary_corrections_applied JSONB;

COMMENT ON COLUMN max_transcription_versions.dictionary_corrections_applied IS 
'Array of word-level edits made to the original Whisper transcription. Used for automated future corrections.';

-- Create an index for JSONB queries on corrections
CREATE INDEX IF NOT EXISTS idx_trans_versions_corrections 
ON max_transcription_versions USING GIN (dictionary_corrections_applied);

-- Create a table to track global patterns of corrections
-- This will learn from all edits to automate future corrections
CREATE TABLE IF NOT EXISTS max_transcription_correction_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original incorrect text from Whisper
  original_text TEXT NOT NULL,
  
  -- Corrected text
  corrected_text TEXT NOT NULL,
  
  -- Context around the correction (e.g., "dental impression")
  context_before TEXT,
  context_after TEXT,
  
  -- Confidence score (increased each time this correction is confirmed)
  confidence_score INTEGER DEFAULT 1,
  
  -- Metadata
  language_code TEXT DEFAULT 'en',
  created_by UUID NOT NULL REFERENCES max_users(id),
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  times_used INTEGER DEFAULT 1,
  
  UNIQUE(original_text, corrected_text, language_code)
);

CREATE INDEX IF NOT EXISTS idx_correction_patterns_original ON max_transcription_correction_patterns(original_text);
CREATE INDEX IF NOT EXISTS idx_correction_patterns_corrected ON max_transcription_correction_patterns(corrected_text);
CREATE INDEX IF NOT EXISTS idx_correction_patterns_confidence ON max_transcription_correction_patterns(confidence_score DESC);

COMMENT ON TABLE max_transcription_correction_patterns IS 
'Global dictionary of transcription corrections learned from user edits. Used to automatically correct future transcriptions.';

-- Enable RLS on the new table
ALTER TABLE max_transcription_correction_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all correction patterns
CREATE POLICY "Users can view correction patterns" 
ON max_transcription_correction_patterns FOR SELECT 
USING (true);

-- RLS Policy: Users can insert patterns from their own edits
CREATE POLICY "Users can insert correction patterns" 
ON max_transcription_correction_patterns FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- RLS Policy: Users can update confidence of patterns they created
CREATE POLICY "Users can update their correction patterns" 
ON max_transcription_correction_patterns FOR UPDATE 
USING (auth.uid() = created_by);

