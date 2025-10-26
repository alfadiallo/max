// API request/response types

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ProjectCreateRequest {
  name: string
  project_type_id: string
  metadata?: {
    location?: string
    date?: string
    misc?: string
  }
}

export interface ProjectUpdateRequest {
  name?: string
  metadata?: {
    location?: string
    date?: string
    misc?: string
  }
}

export interface AudioUploadRequest {
  project_id: string
  file: File
  file_name?: string
}

export interface TranscriptionRequest {
  audio_file_id: string
  language?: string
}

export interface TranslationRequest {
  transcription_id: string
  target_language: string
}

export interface SummaryGenerateRequest {
  transcription_id: string
}

export interface DictionaryAddRequest {
  term_original: string
  term_corrected: string
  language_code: string
  context?: string
}

