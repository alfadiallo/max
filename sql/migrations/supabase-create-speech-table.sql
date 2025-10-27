-- =====================================================
-- Create max_generated_speech table
-- =====================================================
-- This table stores AI-generated speech from translated text
-- Supports both generic voices and voice cloning
-- =====================================================

CREATE TABLE IF NOT EXISTS max_generated_speech (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES max_transcriptions(id) ON DELETE CASCADE,
  translation_id UUID REFERENCES max_translations(id) ON DELETE CASCADE,
  translation_version_id UUID REFERENCES max_translation_versions(id) ON DELETE SET NULL,
  
  -- Speech Generation Details
  language_code TEXT NOT NULL, -- Target language for speech
  voice_id TEXT, -- ElevenLabs voice ID (generic or cloned)
  voice_name TEXT, -- Human-readable voice name
  voice_type TEXT DEFAULT 'generic', -- 'generic', 'instant_clone', 'professional_clone'
  speech_source TEXT NOT NULL, -- 'original_text' or 'edited_text'
  
  -- Generated Audio
  audio_url TEXT NOT NULL, -- URL to generated audio file
  audio_duration_seconds INTEGER,
  audio_file_size_bytes INTEGER,
  
  -- ElevenLabs Metadata
  elevenlabs_voice_id TEXT, -- Original voice used for cloning
  elevenlabs_request_id TEXT, -- For tracking/debugging
  generation_model TEXT DEFAULT 'eleven_multilingual_v2',
  generation_settings JSONB, -- Stability, similarity boost, etc.
  
  -- Quality Metrics
  quality_score FLOAT, -- 0.0 to 1.0
  similarity_score FLOAT, -- How similar to original (0.0 to 1.0)
  
  -- Workflow Status
  status TEXT DEFAULT 'generating', -- 'generating', 'completed', 'failed'
  error_message TEXT,
  
  -- Tracking
  created_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint: One speech per translation version per language
  UNIQUE(translation_id, translation_version_id, language_code)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_generated_speech_transcription_id ON max_generated_speech(transcription_id);
CREATE INDEX IF NOT EXISTS idx_generated_speech_translation_id ON max_generated_speech(translation_id);
CREATE INDEX IF NOT EXISTS idx_generated_speech_status ON max_generated_speech(status);
CREATE INDEX IF NOT EXISTS idx_generated_speech_language ON max_generated_speech(language_code);

-- RLS Policies
ALTER TABLE max_generated_speech ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their generated speech" ON max_generated_speech;
DROP POLICY IF EXISTS "Users can create speech for their translations" ON max_generated_speech;
DROP POLICY IF EXISTS "Users can delete their generated speech" ON max_generated_speech;

CREATE POLICY "Users can view their generated speech" 
ON max_generated_speech FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions t
    JOIN max_audio_files af ON af.id = t.audio_file_id
    JOIN max_projects p ON p.id = af.project_id
    WHERE t.id = max_generated_speech.transcription_id 
    AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create speech for their translations" 
ON max_generated_speech FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM max_transcriptions t
    JOIN max_audio_files af ON af.id = t.audio_file_id
    JOIN max_projects p ON p.id = af.project_id
    WHERE t.id = max_generated_speech.transcription_id 
    AND p.created_by = auth.uid()
  ) AND auth.uid() = created_by
);

CREATE POLICY "Users can delete their generated speech" 
ON max_generated_speech FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions t
    JOIN max_audio_files af ON af.id = t.audio_file_id
    JOIN max_projects p ON p.id = af.project_id
    WHERE t.id = max_generated_speech.transcription_id 
    AND p.created_by = auth.uid()
  )
);

COMMENT ON TABLE max_generated_speech IS 'Stores AI-generated speech from translated text using ElevenLabs';
COMMENT ON COLUMN max_generated_speech.voice_type IS 'Type of voice: generic (standard voices), instant_clone (1-min sample), professional_clone (3+ min sample)';
COMMENT ON COLUMN max_generated_speech.speech_source IS 'Source text: original_text (from translation) or edited_text (from version)';
COMMENT ON COLUMN max_generated_speech.generation_settings IS 'JSON with ElevenLabs API settings: stability, similarity, style, use_speaker_boost, etc.';

