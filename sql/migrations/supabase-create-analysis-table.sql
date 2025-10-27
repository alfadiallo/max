-- =====================================================
-- Create Analysis Table for Max
-- =====================================================
-- This stores Claude's analysis of transcriptions
-- =====================================================

CREATE TABLE IF NOT EXISTS max_transcription_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES max_transcriptions(id) ON DELETE CASCADE,
  transcription_version_id UUID REFERENCES max_transcription_versions(id) ON DELETE SET NULL,
  
  -- Claude Analysis Results
  content_type TEXT, -- Tutorial, Presentation, Interview, etc.
  thematic_tags TEXT[], -- Array of theme tags
  key_concepts TEXT[], -- Array of main concepts
  target_audience TEXT,
  tone TEXT, -- Formal, Casual, Technical, etc.
  
  -- Metadata
  analysis_raw_text TEXT, -- Claude's full response
  confidence_scores JSONB, -- Score for each category
  keywords TEXT[], -- Extracted keywords
  
  -- Tracking
  analyzed_by UUID NOT NULL REFERENCES max_users(id),
  analyzed_at TIMESTAMP DEFAULT NOW(),
  claude_model TEXT DEFAULT 'claude-3-sonnet',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_analyses_transcription_id ON max_transcription_analyses(transcription_id);
CREATE INDEX idx_analyses_content_type ON max_transcription_analyses(content_type);

-- RLS Policies
ALTER TABLE max_transcription_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transcription analyses" 
ON max_transcription_analyses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_transcription_analyses.transcription_id 
    AND max_projects.created_by = auth.uid()
  )
);

CREATE POLICY "Users can create analyses for their transcriptions" 
ON max_transcription_analyses FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_transcription_analyses.transcription_id 
    AND max_projects.created_by = auth.uid()
  ) AND auth.uid() = analyzed_by
);

CREATE POLICY "Users can delete their analyses" 
ON max_transcription_analyses FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_transcription_analyses.transcription_id 
    AND max_projects.created_by = auth.uid()
  )
);

