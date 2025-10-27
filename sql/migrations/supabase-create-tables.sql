-- =====================================================
-- Create Max Database Tables
-- =====================================================
-- All tables are prefixed with "max_" per requirements
-- =====================================================

-- =====================================================
-- 1. Authentication & Users
-- =====================================================

-- Create max_users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS max_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_max_users_email ON max_users(email);

-- =====================================================
-- 2. Project Management
-- =====================================================

-- Create max_project_types table
CREATE TABLE IF NOT EXISTS max_project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES max_users(id),
  archived BOOLEAN DEFAULT FALSE
);

-- Create max_projects table
CREATE TABLE IF NOT EXISTS max_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_type_id UUID NOT NULL REFERENCES max_project_types(id),
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_max_projects_project_type ON max_projects(project_type_id);
CREATE INDEX IF NOT EXISTS idx_max_projects_created_by ON max_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_max_projects_created_at ON max_projects(created_at DESC);

-- =====================================================
-- 3. Audio & Files
-- =====================================================

CREATE TABLE IF NOT EXISTS max_audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES max_projects(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  duration_seconds DECIMAL,
  uploaded_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_max_audio_files_project ON max_audio_files(project_id);
CREATE INDEX IF NOT EXISTS idx_max_audio_files_uploaded_by ON max_audio_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_max_audio_files_created_at ON max_audio_files(created_at DESC);

-- =====================================================
-- 4. Transcriptions
-- =====================================================

CREATE TABLE IF NOT EXISTS max_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id UUID NOT NULL REFERENCES max_audio_files(id),
  transcription_type TEXT DEFAULT 'T-1',
  language_code TEXT DEFAULT 'en',
  raw_text TEXT NOT NULL,
  json_with_timestamps JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_max_transcriptions_audio ON max_transcriptions(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_max_transcriptions_created_at ON max_transcriptions(created_at DESC);

CREATE TABLE IF NOT EXISTS max_transcription_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES max_transcriptions(id),
  version_number INTEGER NOT NULL,
  version_type TEXT NOT NULL,
  edited_text TEXT NOT NULL,
  json_with_timestamps JSONB,
  diff_from_previous TEXT,
  edited_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(transcription_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_max_trans_versions_transcription ON max_transcription_versions(transcription_id);
CREATE INDEX IF NOT EXISTS idx_max_trans_versions_edited_by ON max_transcription_versions(edited_by);

-- =====================================================
-- 5. Dictionary
-- =====================================================

CREATE TABLE IF NOT EXISTS max_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_original TEXT NOT NULL,
  term_corrected TEXT NOT NULL,
  language_code TEXT DEFAULT 'en',
  context TEXT,
  usage_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(term_original, language_code)
);

CREATE INDEX IF NOT EXISTS idx_max_dictionary_original ON max_dictionary(term_original);
CREATE INDEX IF NOT EXISTS idx_max_dictionary_language ON max_dictionary(language_code);
CREATE INDEX IF NOT EXISTS idx_max_dictionary_usage ON max_dictionary(usage_count DESC);

-- =====================================================
-- 6. Translations
-- =====================================================

CREATE TABLE IF NOT EXISTS max_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES max_transcriptions(id),
  language_code TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  json_with_timestamps JSONB,
  dictionary_corrections_applied JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(transcription_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_max_translations_transcription ON max_translations(transcription_id);
CREATE INDEX IF NOT EXISTS idx_max_translations_language ON max_translations(language_code);

CREATE TABLE IF NOT EXISTS max_translation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id UUID NOT NULL REFERENCES max_translations(id),
  version_number INTEGER NOT NULL,
  version_type TEXT NOT NULL,
  edited_text TEXT NOT NULL,
  json_with_timestamps JSONB,
  diff_from_previous TEXT,
  edited_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(translation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_max_trans_lang_versions_translation ON max_translation_versions(translation_id);

-- =====================================================
-- 7. Generated Content
-- =====================================================

CREATE TABLE IF NOT EXISTS max_generated_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES max_transcriptions(id),
  summary_type TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  user_edited_text TEXT,
  edited_by UUID REFERENCES max_users(id),
  edited_at TIMESTAMP,
  generated_at TIMESTAMP DEFAULT NOW(),
  finalized_at TIMESTAMP,
  UNIQUE(transcription_id, summary_type)
);

CREATE INDEX IF NOT EXISTS idx_max_summaries_transcription ON max_generated_summaries(transcription_id);
CREATE INDEX IF NOT EXISTS idx_max_summaries_type ON max_generated_summaries(summary_type);
CREATE INDEX IF NOT EXISTS idx_max_summaries_finalized ON max_generated_summaries(finalized_at);

CREATE TABLE IF NOT EXISTS max_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  template_content TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  created_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_max_templates_name ON max_prompt_templates(template_name);

CREATE TABLE IF NOT EXISTS max_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES max_prompt_templates(id),
  version_number INTEGER NOT NULL,
  template_content TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES max_users(id),
  change_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_max_prompt_versions_template ON max_prompt_versions(template_id);

CREATE TABLE IF NOT EXISTS max_feedback_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL REFERENCES max_generated_summaries(id),
  generated_text TEXT NOT NULL,
  user_edited_text TEXT NOT NULL,
  diff_analysis TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_max_feedback_summary ON max_feedback_log(summary_id);
CREATE INDEX IF NOT EXISTS idx_max_feedback_created_at ON max_feedback_log(created_at DESC);

-- =====================================================
-- Seed Project Types
-- =====================================================

INSERT INTO max_project_types (name, slug) VALUES
  ('Lecture', 'lecture'),
  ('Webinar', 'webinar'),
  ('KE Track - Invisalign Smile Architect', 'ke-track-isa'),
  ('KE Track - Team', 'ke-track-team'),
  ('Fire-Virtual', 'fire-virtual'),
  ('Podcast', 'podcast'),
  ('C-Suite Presentation', 'c-suite')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- Success!
-- =====================================================

-- ✅ Max database tables created successfully!
-- 📊 13 tables created with max_ prefix
-- 📋 Indexes created for performance
-- 🌱 Project types seeded

-- To verify, run:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'max_%' ORDER BY table_name;

