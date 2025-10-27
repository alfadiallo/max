-- =====================================================
-- Insight Pillar: Database Schema
-- =====================================================
-- Creates tables for instructional transcripts, metadata
-- extraction, tagging, and pipeline status tracking
-- =====================================================

-- 1. Insight Transcripts (Instructional Version)
-- Cloned from canonical final version, editable for learning
CREATE TABLE IF NOT EXISTS insight_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES max_transcriptions(id) ON DELETE CASCADE,
  source_final_version_id UUID NOT NULL REFERENCES max_transcription_versions(id) ON DELETE CASCADE,
  
  -- Content (cloned from final version)
  text TEXT NOT NULL,
  json_with_timestamps JSONB,
  
  -- Metadata
  edited_by UUID REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Status tracking
  status TEXT DEFAULT 'pending',  -- pending | extracted | in_review | approved | published
  
  UNIQUE(transcription_id)
);

CREATE INDEX idx_insight_transcripts_transcription ON insight_transcripts(transcription_id);
CREATE INDEX idx_insight_transcripts_status ON insight_transcripts(status);

-- 2. Insight Metadata (Structured Analysis)
-- Extracted using the Metadata Extraction Rulebook
CREATE TABLE IF NOT EXISTS insight_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_transcript_id UUID NOT NULL REFERENCES insight_transcripts(id) ON DELETE CASCADE,
  
  -- Metadata fields per rulebook
  learning_objectives TEXT[],
  procedures_discussed TEXT[],
  products_or_tools TEXT[],
  clinical_domain TEXT[],
  key_concepts TEXT[],
  target_audience TEXT[],
  keywords TEXT[],
  
  -- Flags for ambiguities during extraction
  flags JSONB,
  
  -- Extraction metadata
  extracted_by UUID REFERENCES max_users(id),
  extraction_date TIMESTAMP DEFAULT NOW(),
  last_reviewed_at TIMESTAMP,
  last_reviewed_by UUID REFERENCES max_users(id),
  
  -- Review status
  review_status TEXT DEFAULT 'pending',  -- pending | approved | rejected | needs_revision
  review_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insight_metadata_transcript ON insight_metadata(insight_transcript_id);
CREATE INDEX idx_insight_metadata_status ON insight_metadata(review_status);
CREATE INDEX idx_insight_metadata_procedures ON insight_metadata USING GIN(procedures_discussed);
CREATE INDEX idx_insight_metadata_tools ON insight_metadata USING GIN(products_or_tools);
CREATE INDEX idx_insight_metadata_keywords ON insight_metadata USING GIN(keywords);

-- 3. Insight Tags (Flat Tag Model)
-- For fast filtering and analytics
CREATE TABLE IF NOT EXISTS insight_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_transcript_id UUID NOT NULL REFERENCES insight_transcripts(id) ON DELETE CASCADE,
  
  tag_type TEXT NOT NULL,  -- 'procedure' | 'tool' | 'audience' | 'domain' | 'theme'
  tag_value TEXT NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insight_tags_lookup ON insight_tags(tag_type, tag_value);
CREATE INDEX idx_insight_tags_transcript ON insight_tags(insight_transcript_id);

-- 4. Insight Pipeline Status (Workflow Tracking)
-- Tracks progress through the Insight workflow
CREATE TABLE IF NOT EXISTS insight_pipeline_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES max_transcriptions(id) ON DELETE CASCADE,
  
  -- Current stage
  current_stage TEXT,  -- 'metadata_extraction' | 'in_review' | 'chunking' | 'content_generation' | 'complete'
  
  -- Overall status
  status TEXT DEFAULT 'pending',  -- pending | processing | complete | error
  
  -- Stage tracking
  metadata_extraction_started_at TIMESTAMP,
  metadata_extraction_completed_at TIMESTAMP,
  review_started_at TIMESTAMP,
  review_completed_at TIMESTAMP,
  chunking_started_at TIMESTAMP,
  chunking_completed_at TIMESTAMP,
  content_generation_started_at TIMESTAMP,
  content_generation_completed_at TIMESTAMP,
  
  -- Error handling
  error_message TEXT,
  error_stage TEXT,
  
  -- Overall timing
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_insight_pipeline_transcription ON insight_pipeline_status(transcription_id);
CREATE INDEX idx_insight_pipeline_status ON insight_pipeline_status(status);
CREATE INDEX idx_insight_pipeline_stage ON insight_pipeline_status(current_stage);

-- 5. Content Outputs (Future Phase 3)
-- For storing generated content (emails, posts, blog, etc.)
CREATE TABLE IF NOT EXISTS insight_content_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES max_transcriptions(id) ON DELETE CASCADE,
  
  output_type TEXT NOT NULL,  -- 'email' | 'linkedin' | 'blog' | 'video_clip'
  audience TEXT,               -- 'dentist' | 'da' | 'lab_tech' etc.
  
  -- Content
  title TEXT,
  content TEXT,
  
  -- Source tracking
  source_chunks TEXT[],       -- Which chunk IDs informed this output
  
  -- Status
  status TEXT DEFAULT 'draft',  -- draft | in_review | approved | published
  priority INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  published_at TIMESTAMP,
  
  -- Approvers
  approved_by UUID REFERENCES max_users(id),
  published_by UUID REFERENCES max_users(id)
);

CREATE INDEX idx_insight_outputs_transcription ON insight_content_outputs(transcription_id);
CREATE INDEX idx_insight_outputs_type ON insight_content_outputs(output_type);
CREATE INDEX idx_insight_outputs_status ON insight_content_outputs(status);

-- =====================================================
-- RLS Policies for Insight Tables
-- =====================================================

-- Enable RLS
ALTER TABLE insight_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_pipeline_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_content_outputs ENABLE ROW LEVEL SECURITY;

-- Users can view their own insight data
CREATE POLICY "Users can view their insight transcripts" ON insight_transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_transcripts.transcription_id 
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create insight transcripts" ON insight_transcripts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_transcripts.transcription_id 
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their insight transcripts" ON insight_transcripts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_transcripts.transcription_id 
      AND p.created_by = auth.uid()
    )
  );

-- Metadata viewing
CREATE POLICY "Users can view their insight metadata" ON insight_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM insight_transcripts it
      JOIN max_transcriptions t ON t.id = it.transcription_id
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE it.id = insight_metadata.insight_transcript_id
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create insight metadata" ON insight_metadata FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insight_transcripts it
      JOIN max_transcriptions t ON t.id = it.transcription_id
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE it.id = insight_metadata.insight_transcript_id
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their insight metadata" ON insight_metadata FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM insight_transcripts it
      JOIN max_transcriptions t ON t.id = it.transcription_id
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE it.id = insight_metadata.insight_transcript_id
      AND p.created_by = auth.uid()
    )
  );

-- Tags viewing
CREATE POLICY "Users can view their insight tags" ON insight_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM insight_transcripts it
      JOIN max_transcriptions t ON t.id = it.transcription_id
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE it.id = insight_tags.insight_transcript_id
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create insight tags" ON insight_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM insight_transcripts it
      JOIN max_transcriptions t ON t.id = it.transcription_id
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE it.id = insight_tags.insight_transcript_id
      AND p.created_by = auth.uid()
    )
  );

-- Pipeline status
CREATE POLICY "Users can view their pipeline status" ON insight_pipeline_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_pipeline_status.transcription_id
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create pipeline status" ON insight_pipeline_status FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_pipeline_status.transcription_id
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their pipeline status" ON insight_pipeline_status FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_pipeline_status.transcription_id
      AND p.created_by = auth.uid()
    )
  );

-- Content outputs
CREATE POLICY "Users can view their content outputs" ON insight_content_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_content_outputs.transcription_id
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create content outputs" ON insight_content_outputs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_content_outputs.transcription_id
      AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their content outputs" ON insight_content_outputs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM max_transcriptions t
      JOIN max_audio_files a ON a.id = t.audio_file_id
      JOIN max_projects p ON p.id = a.project_id
      WHERE t.id = insight_content_outputs.transcription_id
      AND p.created_by = auth.uid()
    )
  );

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE insight_transcripts IS 'Instructional versions of transcripts, cloned from canonical final versions. Editable for learning purposes.';
COMMENT ON TABLE insight_metadata IS 'Structured metadata extracted using the Metadata Extraction Rulebook. Fields per Rulebook: learning_objectives, procedures_discussed, products_or_tools, clinical_domain, key_concepts, target_audience, keywords.';
COMMENT ON TABLE insight_tags IS 'Flat tag model for fast filtering. Tags: procedure|tool|audience|domain|theme';
COMMENT ON TABLE insight_pipeline_status IS 'Tracks workflow progress through Insight stages: metadata extraction, review, chunking, content generation.';
COMMENT ON TABLE insight_content_outputs IS 'Generated content outputs (emails, LinkedIn posts, blog articles, video clips).';
