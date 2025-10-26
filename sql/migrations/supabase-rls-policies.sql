-- =====================================================
-- Row Level Security (RLS) Policies for Max
-- =====================================================
-- This enables authenticated users to manage their own data
-- =====================================================

-- Enable RLS on all max_ tables
ALTER TABLE max_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_transcription_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_translation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_generated_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE max_feedback_log ENABLE ROW LEVEL SECURITY;

-- max_users: Users can read all, update their own
CREATE POLICY "Users can view all users" ON max_users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON max_users FOR UPDATE USING (auth.uid() = id);

-- max_projects: Users can create and manage their own projects
CREATE POLICY "Users can create projects" ON max_projects FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can view their own projects" ON max_projects FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can update their own projects" ON max_projects FOR UPDATE USING (auth.uid() = created_by);

-- max_audio_files: Users can create and manage files for their projects
CREATE POLICY "Users can create audio files" ON max_audio_files FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can view audio files for their projects" ON max_audio_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM max_projects 
    WHERE max_projects.id = max_audio_files.project_id 
    AND max_projects.created_by = auth.uid()
  )
);
CREATE POLICY "Users can update their audio files" ON max_audio_files FOR UPDATE USING (auth.uid() = uploaded_by);

-- max_transcriptions: Users can create and view transcriptions for their audio files
CREATE POLICY "Users can create transcriptions" ON max_transcriptions FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can view transcriptions for their audio files" ON max_transcriptions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM max_audio_files 
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_audio_files.id = max_transcriptions.audio_file_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- max_transcription_versions: Users can create and view versions
CREATE POLICY "Users can create transcription versions" ON max_transcription_versions FOR INSERT WITH CHECK (auth.uid() = edited_by);
CREATE POLICY "Users can view transcription versions" ON max_transcription_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_transcription_versions.transcription_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- max_dictionary: All authenticated users can read, users can create their own
CREATE POLICY "Users can view dictionary" ON max_dictionary FOR SELECT USING (true);
CREATE POLICY "Users can create dictionary entries" ON max_dictionary FOR INSERT WITH CHECK (auth.uid() = created_by);

-- max_translations: Users can create and view translations
CREATE POLICY "Users can create translations" ON max_translations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view translations" ON max_translations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_translations.transcription_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- max_translation_versions: Users can create and view translation versions
CREATE POLICY "Users can create translation versions" ON max_translation_versions FOR INSERT WITH CHECK (auth.uid() = edited_by);
CREATE POLICY "Users can view translation versions" ON max_translation_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM max_translations 
    JOIN max_transcriptions ON max_transcriptions.id = max_translations.transcription_id
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_translations.id = max_translation_versions.translation_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- max_generated_summaries: Users can create and view summaries
CREATE POLICY "Users can create summaries" ON max_generated_summaries FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view summaries" ON max_generated_summaries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM max_transcriptions 
    JOIN max_audio_files ON max_audio_files.id = max_transcriptions.audio_file_id
    JOIN max_projects ON max_projects.id = max_audio_files.project_id
    WHERE max_transcriptions.id = max_generated_summaries.transcription_id 
    AND max_projects.created_by = auth.uid()
  )
);

-- max_prompt_templates: All authenticated users can read
CREATE POLICY "Users can view prompt templates" ON max_prompt_templates FOR SELECT USING (true);
CREATE POLICY "Users can create prompt templates" ON max_prompt_templates FOR INSERT WITH CHECK (auth.uid() = created_by);

-- max_prompt_versions: Users can view versions
CREATE POLICY "Users can view prompt versions" ON max_prompt_versions FOR SELECT USING (true);

-- max_feedback_log: Users can create feedback
CREATE POLICY "Users can create feedback" ON max_feedback_log FOR INSERT WITH CHECK (true);

-- =====================================================
-- Success!
-- =====================================================

-- ✅ RLS policies created!
-- Now authenticated users can manage their own data

