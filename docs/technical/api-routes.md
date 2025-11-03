# Max API Routes & Integrations

## API Overview

All API routes are in `/app/api/` and follow RESTful conventions.

**Base URL:** `http://localhost:3000/api` (dev) | `https://usemax.io/api` (production)

**Authentication:** Supabase JWT token in `Authorization` header

---

## Authentication & User Routes

### POST /api/auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "...",
    "expires_in": 3600
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

---

### POST /api/auth/login

Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "session": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600
  }
}
```

---

### POST /api/auth/logout

Clear session (frontend removes tokens).

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out"
}
```

---

## Projects Routes

### GET /api/projects

List all projects for authenticated user.

**Query Parameters:**
- `limit` (optional): Default 20
- `offset` (optional): Default 0
- `type_id` (optional): Filter by project type
- `search` (optional): Search project name

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Endo 101 Lecture",
      "project_type_id": "uuid-type",
      "project_type": {
        "id": "uuid-type",
        "name": "Lecture",
        "slug": "lecture"
      },
      "metadata": {
        "location": "San Francisco, CA",
        "date": "2025-10-25",
        "misc": "Q4 training"
      },
      "created_by": "uuid",
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T10:00:00Z",
      "audio_files_count": 3,
      "archived": false
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

### POST /api/projects

Create a new project.

**Request:**
```json
{
  "name": "Endo 101 Lecture",
  "project_type_id": "uuid",
  "metadata": {
    "location": "San Francisco, CA",
    "date": "2025-10-25",
    "misc": "Q4 training"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Endo 101 Lecture",
    "project_type_id": "uuid",
    "metadata": {...},
    "created_by": "uuid",
    "created_at": "2025-10-25T10:00:00Z",
    "updated_at": "2025-10-25T10:00:00Z",
    "archived": false
  }
}
```

---

### PUT /api/projects/[projectId]

Update project details.

**Request:**
```json
{
  "name": "Updated Project Name",
  "metadata": {
    "location": "New Location",
    "date": "2025-10-26",
    "misc": "Updated notes"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {...}
}
```

---

### GET /api/projects/types

List all project types.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Lecture",
      "slug": "lecture"
    },
    {
      "id": "uuid",
      "name": "Webinar",
      "slug": "webinar"
    },
    ...
  ]
}
```

---

## Audio Upload Routes

### POST /api/audio/upload

Upload audio file to Supabase Storage.

**Content-Type:** `multipart/form-data`

**Fields:**
- `file` (required): Audio file (see supported formats below)
- `project_id` (required): UUID of project

**Supported File Formats:**
- MP3: `audio/mpeg`, `audio/mp3`, `audio/x-mpeg-3`, etc.
- WAV: `audio/wav`, `audio/wave`, `audio/x-wav`, etc.
- M4A/AAC: `audio/mp4`, `audio/m4a`, `audio/aac`, etc.
- WebM: `audio/webm`, `audio/webm;codecs=opus`
- OGG: `audio/ogg`, `audio/oga`, `audio/x-ogg`
- FLAC: `audio/flac`, `audio/x-flac`

**File Extensions:** `.mp3`, `.wav`, `.m4a`, `.aac`, `.webm`, `.ogg`, `.oga`, `.flac`

**File Size Limit:** 500MB

**Access Control:**
- **Editors and Admins**: Can upload to any project
- **Regular Users**: Can only upload to projects they created

**Auto-Sync:** User is automatically synced to `max_users` table if not already present (required for foreign key constraint).

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "project_id": "uuid",
    "file_name": "dr-soto-lecture.mp3",
    "file_path": "audio/lecture/a1b2c3d4-dr-soto-lecture.mp3",
    "file_size_bytes": 45678000,
    "duration_seconds": 1234.5,
    "uploaded_by": "uuid",
    "created_at": "2025-10-25T10:00:00Z"
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Invalid file type. Detected: audio/unknown (extension: .xyz). Supported: MP3, WAV, M4A, AAC, WebM, OGG, FLAC"
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "File too large. Max size: 500MB"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Project not found"
}
```

---

### GET /api/audio/list

List audio files for a project.

**Query Parameters:**
- `project_id` (required): UUID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "file_name": "lecture.mp3",
      "file_path": "audio/lecture/...",
      "file_size_bytes": 45678000,
      "duration_seconds": 1234.5,
      "uploaded_by": "uuid",
      "created_at": "2025-10-25T10:00:00Z"
    }
  ]
}
```

---

### DELETE /api/audio/[fileId]

Delete audio file and associated transcriptions.

**Response (200):**
```json
{
  "success": true,
  "message": "Audio file deleted"
}
```

---

## Transcription Routes

### POST /api/transcribe

Start transcription using OpenAI Whisper API.

**Request:**
```json
{
  "audio_file_id": "uuid",
  "language": "en"
}
```

**Process:**
1. Fetch audio file from storage
2. Call OpenAI Whisper API
3. Parse response into segments with timestamps
4. Store in `transcriptions` table
5. Return result

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "audio_file_id": "uuid",
    "transcription_type": "T-1",
    "language_code": "en",
    "raw_text": "Hello everyone, welcome to today's lecture...",
    "json_with_timestamps": [
      {
        "start": 0.0,
        "end": 5.2,
        "text": "Hello everyone, welcome to today's lecture on endodontics.",
        "speaker": "Dr. Soto"
      },
      ...
    ],
    "created_by": "uuid",
    "created_at": "2025-10-25T10:00:00Z"
  }
}
```

**Error (504):**
```json
{
  "success": false,
  "error": "Transcription timeout (file too long)"
}
```

---

### GET /api/transcriptions

List transcriptions for authenticated user.

**Query Parameters:**
- `project_id` (optional): Filter by project
- `limit`: Default 20
- `offset`: Default 0

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "audio_file_id": "uuid",
      "project_id": "uuid",
      "project_name": "Endo 101",
      "audio_file_name": "lecture.mp3",
      "transcription_type": "T-1",
      "language_code": "en",
      "raw_text": "...",
      "json_with_timestamps": [...],
      "created_at": "2025-10-25T10:00:00Z",
      "latest_version": {
        "version_number": 1,
        "version_type": "H-1",
        "edited_at": "2025-10-25T11:00:00Z",
        "edited_by": "uuid"
      },
      "translations": {
        "es": { version: 1, edited: true },
        "pt": { version: 1, edited: false },
        ...
      }
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/transcriptions/[transcriptionId]

Get full transcription detail with version history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "audio_file_id": "uuid",
    "transcription_type": "T-1",
    "language_code": "en",
    "raw_text": "...",
    "json_with_timestamps": [...],
    "current_version": {
      "version_number": 2,
      "version_type": "H-2",
      "edited_text": "...",
      "edited_by": "uuid",
      "edited_at": "2025-10-25T12:00:00Z"
    },
    "version_history": [
      {
        "version_number": 1,
        "version_type": "H-1",
        "edited_by": "uuid",
        "edited_at": "2025-10-25T11:00:00Z"
      },
      {
        "version_number": 2,
        "version_type": "H-2",
        "edited_by": "uuid",
        "edited_at": "2025-10-25T12:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/transcriptions/[transcriptionId]/save-version

Save edited transcription as new version.

**Request:**
```json
{
  "edited_text": "Corrected transcription text...",
  "version_type": "H-1"
}
```

**Process:**
1. Calculate diff from previous version (or T-1)
2. Create new `transcription_versions` record
3. Increment `version_number`
4. Return updated transcription

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "transcription_id": "uuid",
    "version_number": 1,
    "version_type": "H-1",
    "edited_text": "...",
    "edited_by": "uuid",
    "created_at": "2025-10-25T11:00:00Z",
    "diff_from_previous": [
      {
        "operation": "replace",
        "position": 45,
        "old_text": "veneers",
        "new_text": "veneers"
      }
    ]
  }
}
```

---

### POST /api/transcriptions/[transcriptionId]/auto-save

Auto-save draft (NOT versioned, recoverable).

**Request:**
```json
{
  "drafted_text": "Work in progress..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Draft saved",
  "last_saved_at": "2025-10-25T11:05:00Z"
}
```

---

## Sonix Integration Routes

### GET /api/sonix/import

List all media files from Sonix account (Admin only).

**Query Parameters:**
- `status` (optional): Filter by status (`completed`, `transcribing`, `aligning`, `failed`)
- `page` (optional): Page number (default: 1)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "media": [
      {
        "id": "vK5prwBx",
        "name": "1.3_what_type_of_cases (240p).mp4",
        "language": "en",
        "duration": 606,
        "video": true,
        "status": "completed",
        "created_at": 1739849398,
        "public_url": "https://sonix.ai/r/...",
        "quality_score": "97.36",
        "imported": false,
        "audio_file_id": null
      }
    ],
    "total_pages": 1,
    "page": 1
  }
}
```

---

### POST /api/sonix/import

Import a transcript from Sonix into Max.

**Request:**
```json
{
  "sonix_media_id": "vK5prwBx",
  "project_id": "uuid"  // Required if audio_file_id not provided
  // OR
  "audio_file_id": "uuid"  // Required if project_id not provided
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "transcription_id": "uuid",
    "audio_file_id": "uuid",
    "project_id": "uuid",
    "sonix_media_id": "vK5prwBx",
    "duration": 606,
    "segments_count": 45
  }
}
```

**Process:**
1. Fetch media details from Sonix API
2. Fetch transcript JSON from Sonix API
3. Convert Sonix format to Max format (handles `start_time`/`end_time` → `start`/`end`)
4. Create/update audio file record in `max_audio_files`
5. Create transcription record in `max_transcriptions` with `source: 'sonix'`

**Error (400):**
```json
{
  "success": false,
  "error": "Transcription not completed. Current status: transcribing"
}
```

**Error (409):**
```json
{
  "success": false,
  "error": "Transcription already exists for this audio file"
}
```

---

## Dictionary Routes

### GET /api/dictionary

List all dictionary entries.

**Query Parameters:**
- `language_code`: 'en', 'es', 'pt', etc.
- `search`: Search term
- `limit`: Default 50

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "term_original": "veneers",
      "term_corrected": "veneers",
      "language_code": "en",
      "context": "dental prosthetics",
      "usage_count": 5,
      "created_by": "uuid",
      "created_at": "2025-10-25T10:00:00Z"
    }
  ],
  "total": 23
}
```

---

### POST /api/dictionary/add

Add term to dictionary or update if exists.

**Request:**
```json
{
  "term_original": "implane",
  "term_corrected": "implant",
  "language_code": "en",
  "context": "surgical"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "term_original": "implane",
    "term_corrected": "implant",
    "language_code": "en",
    "context": "surgical",
    "usage_count": 0,
    "created_by": "uuid",
    "created_at": "2025-10-25T10:00:00Z"
  }
}
```

---

### POST /api/dictionary/apply

Apply dictionary corrections to text.

**Request:**
```json
{
  "text": "The patient received several veneers and an implane.",
  "language_code": "en"
}
```

**Process:**
1. Fetch all dictionary entries for language_code
2. Sort by term_original length (longest first)
3. Replace all occurrences (case-insensitive)
4. Increment usage_count
5. Return corrected text + replacements list

**Response (200):**
```json
{
  "success": true,
  "data": {
    "corrected_text": "The patient received several veneers and an implant.",
    "replacements": [
      {
        "term_original": "veneers",
        "term_corrected": "veneers",
        "count": 1
      },
      {
        "term_original": "implane",
        "term_corrected": "implant",
        "count": 1
      }
    ]
  }
}
```

---

## Translation Routes

### POST /api/translations/create

Create translation in target language using Claude API.

**Request:**
```json
{
  "transcription_id": "uuid",
  "target_language": "es"
}
```

**Process:**
1. Fetch latest H-X version (or T-1) of English transcription
2. Get current prompt template for translations
3. Call Claude API with prompt + transcription
4. Apply dictionary corrections
5. Parse timestamps from response
6. Store in `translations` table
7. Log all corrections in `dictionary_corrections_applied`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "transcription_id": "uuid",
    "language_code": "es",
    "translated_text": "Hola a todos, bienvenidos a la conferencia de hoy...",
    "json_with_timestamps": [
      {
        "start": 0.0,
        "end": 5.2,
        "text": "Hola a todos, bienvenidos a la conferencia de hoy sobre endodoncia.",
        "speaker": "Dra. Soto"
      }
    ],
    "dictionary_corrections_applied": [
      {
        "term_original": "veneers",
        "term_corrected": "carillas",
        "position": [45, 52]
      }
    ],
    "created_at": "2025-10-25T12:00:00Z"
  }
}
```

---

### GET /api/translations

List all translations for a transcription.

**Query Parameters:**
- `transcription_id` (required): UUID

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "language_code": "es",
      "language_name": "Spanish",
      "translated_text": "...",
      "current_version": 1,
      "edited": true,
      "created_at": "2025-10-25T12:00:00Z"
    },
    {
      "id": "uuid",
      "language_code": "pt",
      "language_name": "Portuguese",
      "translated_text": "...",
      "current_version": 0,
      "edited": false,
      "created_at": "2025-10-25T12:00:00Z"
    }
  ]
}
```

---

### POST /api/translations/[translationId]/save-version

Edit and save new version of translation.

**Request:**
```json
{
  "edited_text": "Texto corregido...",
  "version_type": "H-2-es"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "translation_id": "uuid",
    "version_number": 1,
    "version_type": "H-2-es",
    "edited_text": "...",
    "edited_by": "uuid",
    "created_at": "2025-10-25T13:00:00Z"
  }
}
```

---

### POST /api/translations/[translationId]/ready-for-elevenlabs

Mark translation as approved and ready for voice synthesis.

**Request:**
```json
{
  "translation_id": "uuid",
  "language_code": "es"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Translation ready for ElevenLabs",
  "data": {
    "download_link": "https://storage.url/translation-es.txt",
    "language": "Spanish",
    "text_preview": "Hola a todos..."
  }
}
```

---

## Generated Summaries Routes

### POST /api/summaries/generate

Generate email, LinkedIn, and blog summaries using Claude API.

**Request:**
```json
{
  "transcription_id": "uuid"
}
```

**Process:**
1. Fetch latest H-X (or T-1) English transcription
2. For each summary type (email, linkedin, blog):
   a. Fetch current prompt template
   b. Call Claude API with prompt + transcription
   c. Store in `generated_summaries` table
3. Return all three summaries

**Response (200):**
```json
{
  "success": true,
  "data": {
    "email": {
      "id": "uuid",
      "summary_type": "email",
      "generated_text": "Hi team,\n\nDr. Soto covered key endodontic techniques today, emphasizing modern approaches to root canal treatment. This session is essential for staying current with best practices.\n\nBest regards",
      "user_edited_text": null,
      "generated_at": "2025-10-25T14:00:00Z",
      "finalized_at": null
    },
    "linkedin": {
      "id": "uuid",
      "summary_type": "linkedin",
      "generated_text": "Great session today on modern endodontics! Dr. Soto's insights on advanced techniques are transforming how we approach root canal treatment. 🔬📚 #dentaleducation #dentistry",
      "user_edited_text": null,
      "generated_at": "2025-10-25T14:00:00Z",
      "finalized_at": null
    },
    "blog": {
      "id": "uuid",
      "summary_type": "blog",
      "generated_text": "## Modern Approaches to Endodontic Treatment\n\nDr. Soto's latest insights...",
      "user_edited_text": null,
      "generated_at": "2025-10-25T14:00:00Z",
      "finalized_at": null
    }
  }
}
```

---

### PUT /api/summaries/[summaryId]

Edit summary text.

**Request:**
```json
{
  "edited_text": "Hi team,\n\nToday's endodontics session covered...",
  "finalize": false
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "summary_type": "email",
    "generated_text": "...",
    "user_edited_text": "...",
    "edited_by": "uuid",
    "edited_at": "2025-10-25T14:30:00Z",
    "finalized_at": null
  }
}
```

---

### POST /api/summaries/[summaryId]/finalize

Finalize edited summary and create feedback log entry.

**Request:**
```json
{
  "finalized": true
}
```

**Process:**
1. Update `finalized_at` timestamp
2. Create entry in `feedback_log`
3. Calculate diff between generated and user_edited
4. Store diff analysis (length changes, tone, etc.)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "summary_type": "email",
    "generated_text": "...",
    "user_edited_text": "...",
    "finalized_at": "2025-10-25T14:45:00Z",
    "feedback_logged": true
  }
}
```

---

## Prompt Template Routes

### GET /api/prompts

List all prompt templates.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "template_name": "email_summary",
      "template_content": "Summarize the following dental education content as a professional email...",
      "version_number": 2,
      "created_by": "uuid",
      "created_at": "2025-10-25T10:00:00Z",
      "updated_at": "2025-10-25T12:00:00Z"
    },
    ...
  ]
}
```

---

### GET /api/prompts/[templateId]

Get template with full version history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "template_name": "email_summary",
    "template_content": "Current template content...",
    "version_number": 2,
    "version_history": [
      {
        "version_number": 1,
        "template_content": "Original template...",
        "changed_by": "uuid",
        "change_notes": "Initial version",
        "created_at": "2025-10-25T10:00:00Z"
      },
      {
        "version_number": 2,
        "template_content": "Current template...",
        "changed_by": "uuid",
        "change_notes": "Made it more conversational",
        "created_at": "2025-10-25T12:00:00Z"
      }
    ]
  }
}
```

---

### PUT /api/prompts/[templateId]

Update prompt template and create new version.

**Request:**
```json
{
  "template_content": "Updated template content...",
  "change_notes": "Made language simpler and more engaging"
}
```

**Process:**
1. Create new `prompt_versions` record with old content
2. Increment `version_number` in `prompt_templates`
3. Update template_content
4. Set changed_by and change_notes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "template_name": "email_summary",
    "template_content": "Updated content...",
    "version_number": 3,
    "changed_by": "uuid",
    "updated_at": "2025-10-25T14:00:00Z"
  }
}
```

---

### POST /api/prompts/[templateId]/revert

Revert to previous version.

**Request:**
```json
{
  "version_number": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reverted to version 1",
  "data": {
    "id": "uuid",
    "template_name": "email_summary",
    "template_content": "Previous version content...",
    "version_number": 4,
    "created_from_version": 1
  }
}
```

---

## Feedback & Analytics Routes

### GET /api/feedback/summaries

Get feedback log for summary improvements.

**Query Parameters:**
- `days`: Last N days (default 30)
- `summary_type`: Filter by type (email/linkedin/blog)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "summary_id": "uuid",
      "summary_type": "email",
      "generated_text": "...",
      "user_edited_text": "...",
      "diff_analysis": {
        "original_length": 245,
        "edited_length": 198,
        "length_change_percent": -19,
        "tone_changes": ["more casual"],
        "changes": [...]
      },
      "created_at": "2025-10-25T14:45:00Z"
    }
  ],
  "summary": {
    "total_entries": 12,
    "avg_edit_count": 3,
    "avg_length_change": -15,
    "most_common_edits": ["simplification", "added examples"]
  }
}
```

---

## Diagnostic Routes

### GET /api/health

System health check.

**Response (200):**
```json
{
  "success": true,
  "status": "healthy",
  "checks": {
    "database": "✅ Connected",
    "storage": "✅ Buckets available",
    "api_keys": {
      "openai": "✅ Valid",
      "anthropic": "✅ Valid",
      "elevenlabs": "⚠️ Not configured"
    },
    "timestamp": "2025-10-25T15:00:00Z"
  }
}
```

---

## Error Handling

All API routes return consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional info
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401) - No valid auth token
- `FORBIDDEN` (403) - User doesn't have permission
- `NOT_FOUND` (404) - Resource doesn't exist
- `VALIDATION_ERROR` (400) - Invalid request data
- `SERVER_ERROR` (500) - Unexpected error
- `TIMEOUT` (504) - Operation took too long

---

## Rate Limiting

**Per-user limits** (to prevent abuse):
- 100 requests/minute (global)
- 10 concurrent file uploads
- 5 concurrent transcriptions
- 50 translations/day

**API Integration limits** (from external services):
- OpenAI: 3 requests/min (free tier)
- Anthropic: 50k tokens/day
- ElevenLabs: 1000 characters/day (free tier)

---

## Integration Details

### OpenAI Whisper

**File:** `/src/lib/api/whisper.ts`

```typescript
import { transcribeAudio } from '@/lib/api/whisper'

const result = await transcribeAudio({
  filePath: 'audio/lecture/uuid-file.mp3',
  language: 'en'
})

// Returns:
// {
//   text: "Full transcription...",
//   segments: [
//     { id: 0, seek: 0, start: 0, end: 5.2, text: "...", tokens: [...], temperature: 0.1, ... }
//   ]
// }
```

### Anthropic Claude

**File:** `/src/lib/api/claude.ts`

```typescript
import { generateTranslation, generateSummary } from '@/lib/api/claude'

// Translation
const translation = await generateTranslation({
  text: 'English transcription...',
  targetLanguage: 'es',
  prompt: customPrompt // optional
})

// Summary
const summary = await generateSummary({
  text: 'Transcription...',
  summaryType: 'email', // 'email' | 'linkedin' | 'blog'
  prompt: customPrompt // from database
})
```

### ElevenLabs (Future)

**File:** `/src/lib/api/elevenlabs.ts`

```typescript
import { synthesizeVoice } from '@/lib/api/elevenlabs'

const audioBuffer = await synthesizeVoice({
  text: 'Spanish translation text...',
  language: 'es',
  voiceId: 'karla-soto-spanish',
  settings: {
    stability: 0.75,
    similarity: 0.75
  }
})
```

---

## Implementation Checklist

- [x] Implement all auth routes
- [x] Implement projects CRUD
- [x] Implement audio upload with progress tracking
- [x] Integrate Whisper transcription
- [x] Integrate Sonix transcription (v2.0.0)
- [x] Implement transcription editing + versioning
- [x] Implement dictionary system
- [x] Integrate Claude translation
- [x] Integrate Claude summary generation
- [x] Implement prompt template editing
- [x] Integrate ElevenLabs speech generation
- [ ] Implement feedback logging
- [ ] Add rate limiting
- [x] Add comprehensive error handling
- [x] Add request validation
- [x] Add audit logging