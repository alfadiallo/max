// Database types for Max project
// These correspond to the max_ tables in Supabase

export interface MaxUser {
  id: string
  email: string
  full_name: string | null
  created_at: string
  updated_at: string
}

export interface MaxProjectType {
  id: string
  name: string
  slug: string
  created_at: string
  created_by: string | null
  archived: boolean
}

export interface MaxProject {
  id: string
  name: string
  project_type_id: string
  metadata: {
    location?: string
    date?: string
    misc?: string
  }
  created_by: string
  created_at: string
  updated_at: string
  archived: boolean
}

export interface MaxAudioFile {
  id: string
  project_id: string
  file_name: string
  file_path: string
  file_size_bytes: number | null
  duration_seconds: number | null
  uploaded_by: string
  created_at: string
  updated_at: string
  archived: boolean
}

export interface TranscriptionSegment {
  start: number
  end: number
  text: string
  speaker: string
}

export interface MaxTranscription {
  id: string
  audio_file_id: string
  transcription_type: string
  language_code: string
  raw_text: string
  json_with_timestamps: TranscriptionSegment[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface MaxTranscriptionVersion {
  id: string
  transcription_id: string
  version_number: number
  version_type: string
  edited_text: string
  json_with_timestamps: TranscriptionSegment[] | null
  diff_from_previous: string | null
  edited_by: string
  created_at: string
}

export interface MaxDictionary {
  id: string
  term_original: string
  term_corrected: string
  language_code: string
  context: string | null
  usage_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface MaxTranslation {
  id: string
  transcription_id: string
  language_code: string
  translated_text: string
  json_with_timestamps: TranscriptionSegment[] | null
  dictionary_corrections_applied: any | null
  created_at: string
  updated_at: string
}

export interface MaxTranslationVersion {
  id: string
  translation_id: string
  version_number: number
  version_type: string
  edited_text: string
  json_with_timestamps: TranscriptionSegment[] | null
  diff_from_previous: string | null
  edited_by: string
  created_at: string
}

export interface MaxGeneratedSummary {
  id: string
  transcription_id: string
  summary_type: 'email' | 'linkedin' | 'blog'
  generated_text: string
  user_edited_text: string | null
  edited_by: string | null
  edited_at: string | null
  generated_at: string
  finalized_at: string | null
}

export interface MaxPromptTemplate {
  id: string
  template_name: string
  template_content: string
  version_number: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface MaxPromptVersion {
  id: string
  template_id: string
  version_number: number
  template_content: string
  changed_by: string
  change_notes: string | null
  created_at: string
}

export interface MaxFeedbackLog {
  id: string
  summary_id: string
  generated_text: string
  user_edited_text: string
  diff_analysis: string | null
  created_at: string
}

