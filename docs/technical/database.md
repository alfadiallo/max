# Max Database Schema & Architecture

## Overview

The Max database is built on PostgreSQL (via Supabase) and is designed to handle:
- Multi-version transcriptions and translations
- Complete audit trails (who changed what, when)
- Dictionary-based term standardization
- Prompt template versioning
- Feedback logging for AI model improvement

---

## Core Tables

### 1. Authentication & Users

#### `auth.users` (Supabase Auth)
Managed by Supabase Auth. Max references but doesn't write directly.

```sql
id UUID PRIMARY KEY,
email TEXT UNIQUE,
encrypted_password TEXT,
email_confirmed_at TIMESTAMP,
created_at TIMESTAMP,
updated_at TIMESTAMP
```

#### `users`
Links Supabase Auth to Max application.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);
```

**Relationships:**
- Extends `auth.users` (1:1)
- Referenced by: projects, audio_files, transcriptions, etc.

---

### 2. Project Management

#### `project_types`
Fixed list of project categories. Seeded during setup.

```sql
CREATE TABLE project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'Lecture', 'Webinar', 'ISA', etc.
  slug TEXT NOT NULL UNIQUE, -- 'lecture', 'webinar', 'isa', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  archived BOOLEAN DEFAULT FALSE
);

-- Seed data
INSERT INTO project_types (name, slug) VALUES
  ('Lecture', 'lecture'),
  ('Webinar', 'webinar'),
  ('ISA', 'isa'),
  ('Fire-Virtual', 'fire-virtual'),
  ('Podcast', 'podcast'),
  ('C-Suite Presentation', 'c-suite'),
  ('Other', 'other');
```

**Note:** Create new project types only via admin. End users select from dropdown.

#### `projects`
Collections of audio files organized by type and metadata.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_type_id UUID NOT NULL REFERENCES project_types(id),
  metadata JSONB DEFAULT '{}', -- { location, date, misc }
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_projects_project_type ON projects(project_type_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
```

**Metadata Structure:**
```json
{
  "location": "San Francisco, CA",
  "date": "2025-10-25",
  "misc": "Q3 quarterly review"
}
```

**Design Decisions:**
- `metadata` as JSONB allows flexible future fields
- `archived` for soft deletes
- All users can see all projects (simplified permissions)

---

### 3. Audio & Files

#### `audio_files` (also `max_audio_files`)
Raw audio/video uploads. Supports both direct uploads and Sonix imports.

```sql
CREATE TABLE max_audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES max_projects(id),
  file_name TEXT NOT NULL, -- Original filename: 'dr-soto-lecture.mp3'
  file_path TEXT NOT NULL, -- Storage path: 'audio/lecture/[uuid]-dr-soto-lecture.mp3'
  file_size_bytes BIGINT,
  duration_seconds DECIMAL,
  uploaded_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE,
  -- Sonix integration (v2.0.0)
  sonix_media_id TEXT, -- Reference to Sonix media ID
  file_type TEXT DEFAULT 'audio' CHECK (file_type IN ('audio', 'video')),
  sonix_status TEXT -- Sync status with Sonix
);

-- Indexes
CREATE INDEX idx_max_audio_files_project ON max_audio_files(project_id);
CREATE INDEX idx_max_audio_files_uploaded_by ON max_audio_files(uploaded_by);
CREATE INDEX idx_max_audio_files_created_at ON max_audio_files(created_at DESC);
CREATE INDEX idx_max_audio_files_sonix_media_id ON max_audio_files(sonix_media_id) WHERE sonix_media_id IS NOT NULL;
```

**File Path Strategy:**
```
Bucket: max-audio
Structure: audio/{project_type}/{uuid}-{original_name}

Examples:
- audio/lecture/a1b2c3d4-dr-soto-endo-101.mp3
- audio/webinar/e5f6g7h8-q3-dental-updates.mp3
- audio/podcast/i9j0k1l2-episode-5-implants.mp3
```

**Why UUIDs in filename:**
- Prevents name collisions
- Secure (doesn't leak information)
- Easy to match to database records

---

### 4. Transcriptions (English)

#### `transcriptions` (also `max_transcriptions`)
Initial transcription output (T-1) from Whisper or Sonix.

```sql
CREATE TABLE max_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id UUID NOT NULL REFERENCES max_audio_files(id),
  transcription_type TEXT DEFAULT 'T-1',
  language_code TEXT DEFAULT 'en',
  raw_text TEXT NOT NULL, -- Full transcription as plain text
  json_with_timestamps JSONB NOT NULL, -- Detailed segment data with word-level timestamps
  created_by UUID NOT NULL REFERENCES max_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Source tracking (v2.0.0)
  source TEXT DEFAULT 'whisper' CHECK (source IN ('whisper', 'sonix')),
  final_version_id UUID REFERENCES max_transcription_versions(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_max_transcriptions_audio ON max_transcriptions(audio_file_id);
CREATE INDEX idx_max_transcriptions_created_at ON max_transcriptions(created_at DESC);
CREATE INDEX idx_max_transcriptions_source ON max_transcriptions(source);
CREATE INDEX idx_max_transcriptions_final_version ON max_transcriptions(final_version_id);
```

**JSON Structure (Sonix-style with nested words):**
```json
{
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 5.2,
      "text": "Hello everyone, welcome to today's lecture on endodontics.",
      "words": [
        { "word": "Hello", "start": 0.0, "end": 0.5 },
        { "word": "everyone", "start": 0.5, "end": 1.2 }
      ]
    }
  ],
  "metadata": {
    "source": "sonix" | "whisper",
    "duration": 606.0
  }
}
```

**Design Decisions:**
- Store both `raw_text` (for search) and `json_with_timestamps` (for UI display)
- Timestamps in decimal seconds for precision
- Fixed speaker name ("Dr. Soto") for now

---

#### `transcription_versions`
Edited versions of transcription (H-1, H-2, etc.).

```sql
CREATE TABLE transcription_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id),
  version_number INTEGER NOT NULL, -- 1, 2, 3...
  version_type TEXT NOT NULL, -- 'H-1', 'H-2', 'H-3', etc.
  edited_text TEXT NOT NULL, -- Full text after edits
  json_with_timestamps JSONB, -- Updated timestamps
  diff_from_previous TEXT, -- JSON diff
  edited_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(transcription_id, version_number),
  FOREIGN KEY (transcription_id) REFERENCES transcriptions(id)
);

-- Indexes
CREATE INDEX idx_trans_versions_transcription ON transcription_versions(transcription_id);
CREATE INDEX idx_trans_versions_edited_by ON transcription_versions(edited_by);
```

**Versioning Workflow:**

```
Initial: T-1 (created by Whisper)
         ↓
User edits → H-1 (version_number: 1, version_type: 'H-1')
         ↓
User edits again → H-2 (version_number: 2, version_type: 'H-2')
         ↓
H-2 is finalized and sent to translation
```

**Diff Format (JSON):**
```json
{
  "operation": "replace",
  "position": 45,
  "old_text": "veneers",
  "new_text": "veneers",
  "timestamp": "2025-10-26T14:32:00Z",
  "user_id": "uuid"
}
```

**Auto-Save Strategy:**
- Every 5 minutes: Save draft to temp cache (NOT versioned)
- On "Save": Create versioned record
- On "Discard": Lose draft (user warned)

---

### 5. Dictionary

#### `dictionary`
Master glossary of dental terminology with corrections.

```sql
CREATE TABLE dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_original TEXT NOT NULL, -- What Whisper might transcribe
  term_corrected TEXT NOT NULL, -- The correct term
  language_code TEXT DEFAULT 'en',
  context TEXT, -- e.g., "dental prosthetics"
  usage_count INTEGER DEFAULT 0, -- How many times this correction was applied
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(term_original, language_code)
);

-- Indexes
CREATE INDEX idx_dictionary_original ON dictionary(term_original);
CREATE INDEX idx_dictionary_language ON dictionary(language_code);
CREATE INDEX idx_dictionary_usage ON dictionary(usage_count DESC);
```

**Example Data:**
```
term_original          | term_corrected    | language_code | context
-----------------------+-------------------+---------------+------------------
"veneers"              | "veneers"         | en            | prosthetics
"implane"              | "implant"         | en            | surgical
"endodontik"           | "endodontic"      | en            | root-canal
"periodontol"          | "periodontal"     | en            | gum-disease
"ceramic crown"        | "ceramic crown"   | en            | restorative
"ortho-dontic"         | "orthodontic"     | en            | orthodontics
```

**Workflow:**
1. User encounters transcription error during editing
2. Corrects it manually
3. Clicks "Add to Dictionary"
4. System creates entry with `term_original` (wrong), `term_corrected` (right)
5. Future transcriptions → apply dictionary automatically? NO (English only)
6. Translations → apply dictionary to ensure consistency
7. `usage_count` incremented each time applied

---

### 6. Translations

#### `translations`
Translated text in target languages.

```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id),
  language_code TEXT NOT NULL, -- 'es', 'pt', 'fr', 'de', 'it', 'zh', 'hi', 'ar'
  translated_text TEXT NOT NULL,
  json_with_timestamps JSONB,
  dictionary_corrections_applied JSONB, -- Track what was replaced
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(transcription_id, language_code)
);

-- Indexes
CREATE INDEX idx_translations_transcription ON translations(transcription_id);
CREATE INDEX idx_translations_language ON translations(language_code);
```

**Dictionary Corrections Applied Format:**
```json
[
  {
    "term_original": "veneers",
    "term_corrected": "veneers",
    "position": [45, 52],
    "language_code": "en"
  }
]
```

**Design Decisions:**
- One translation per language per English transcription
- Track all corrections for audit trail
- Timestamps preserved from English version

#### `translation_versions`
Edited versions of translations (H-2-es, H-2-pt, etc.).

```sql
CREATE TABLE translation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id UUID NOT NULL REFERENCES translations(id),
  version_number INTEGER NOT NULL,
  version_type TEXT NOT NULL, -- 'H-2-es', 'H-2-pt', etc.
  edited_text TEXT NOT NULL,
  json_with_timestamps JSONB,
  diff_from_previous TEXT, -- JSON diff
  edited_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(translation_id, version_number)
);

-- Indexes
CREATE INDEX idx_trans_lang_versions_translation ON translation_versions(translation_id);
```

**Versioning:**
```
Initial: T-1-es (auto-generated from Claude)
         ↓
User edits → H-2-es (version_number: 1)
         ↓
User edits again → H-2-es (version_number: 2)
         ↓
Finalized → Ready for ElevenLabs
```

---

### 7. Content Generation

#### `generated_summaries`
AI-generated summaries (email, LinkedIn, blog).

```sql
CREATE TABLE generated_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id UUID NOT NULL REFERENCES transcriptions(id),
  summary_type TEXT NOT NULL, -- 'email', 'linkedin', 'blog'
  generated_text TEXT NOT NULL, -- What Claude produced
  user_edited_text TEXT, -- What user changed it to
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMP,
  generated_at TIMESTAMP DEFAULT NOW(),
  finalized_at TIMESTAMP,
  
  UNIQUE(transcription_id, summary_type)
);

-- Indexes
CREATE INDEX idx_summaries_transcription ON generated_summaries(transcription_id);
CREATE INDEX idx_summaries_type ON generated_summaries(summary_type);
CREATE INDEX idx_summaries_finalized ON generated_summaries(finalized_at);
```

**Workflow:**
```
generated_text = Claude output (read-only)
user_edited_text = NULL initially

User clicks "Edit"
    ↓
User makes changes
    ↓
User clicks "Finalize"
    ↓
user_edited_text = user's version
edited_by = user ID
edited_at = NOW()
finalized_at = NOW()
    ↓
Entry created in feedback_log
```

---

#### `prompt_templates`
Editable templates for summary generation.

```sql
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE, -- 'email_summary', 'linkedin_summary', 'blog_summary'
  template_content TEXT NOT NULL, -- The markdown/prompt
  version_number INTEGER DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_templates_name ON prompt_templates(template_name);
```

**Initial Data:**
```sql
INSERT INTO prompt_templates (template_name, template_content, created_by) VALUES
(
  'email_summary',
  'Summarize the following dental education content as a professional email. 
   Keep it to 2-3 sentences. Tone: professional and informative. 
   Include a call-to-action if appropriate. 
   
   Content: {transcription_text}',
  [system_user_id]
),
(
  'linkedin_summary',
  'Create a LinkedIn post highlighting the key insight from this content. 
   Maximum 150 characters. Tone: engaging and thought-provoking. 
   Include relevant hashtags (#dentaleducation, #dentistry, etc.).
   
   Content: {transcription_text}',
  [system_user_id]
),
(
  'blog_summary',
  'Write a blog post excerpt (300-500 words) expanding on the key topics. 
   Tone: educational and conversational. Structure with headers and bullet points.
   Make it suitable for a general dental audience.
   
   Content: {transcription_text}',
  [system_user_id]
);
```

#### `prompt_versions`
Version history of templates.

```sql
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES prompt_templates(id),
  version_number INTEGER NOT NULL,
  template_content TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  change_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(template_id, version_number)
);

-- Indexes
CREATE INDEX idx_prompt_versions_template ON prompt_versions(template_id);
```

**Workflow:**
1. User goes to Settings > Prompt Templates
2. Clicks "Edit" on email_summary
3. Changes template text
4. Clicks "Save"
5. System:
   - Increments version_number in prompt_templates
   - Creates new row in prompt_versions with old version
   - Updates prompt_templates with new content
6. All new summaries use latest version

---

#### `feedback_log`
Compares AI-generated to user-edited summaries.

```sql
CREATE TABLE feedback_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL REFERENCES generated_summaries(id),
  generated_text TEXT NOT NULL,
  user_edited_text TEXT NOT NULL,
  diff_analysis TEXT, -- JSON of changes
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedback_summary ON feedback_log(summary_id);
CREATE INDEX idx_feedback_created_at ON feedback_log(created_at DESC);
```

**Triggered When:**
User clicks "Finalize" on an edited summary.

**Diff Analysis Format:**
```json
{
  "type": "summary",
  "original_length": 245,
  "edited_length": 198,
  "length_change_percent": -19,
  "tone_changes": ["more casual", "removed technical jargon"],
  "structure_changes": ["added bullet points", "reorganized sections"],
  "additions": ["Added closing sentence"],
  "deletions": ["Removed complex terminology"],
  "changes": [
    {
      "type": "replace",
      "original": "utilize advanced endodontic techniques",
      "edited": "use advanced root canal methods",
      "reason": "simplification"
    }
  ]
}
```

**Use Case:**
Users can review feedback_log to see patterns:
- "Most edits shorten content by 15-20%"
- "Users prefer simpler language"
- "LinkedIn posts work best with emojis"
- → Informs prompt refinement

---

## Data Relationships Diagram

```
users (1) ────────→ (many) projects
  ↓                    ↓
  │              project_types
  │                    
  ├→ (many) audio_files
  │              ↓
  │              transcriptions (T-1)
  │              ↓
  │              transcription_versions (H-1, H-2...)
  │              ↓
  │              translations (one per language)
  │              ↓
  │              translation_versions (H-2-es, H-2-pt...)
  │              ↓
  │              generated_summaries (email, linkedin, blog)
  │                    ↓
  │              prompt_templates → prompt_versions
  │                    ↓
  │              feedback_log
  │
  └→ (many) dictionary (tracks corrections)
```

---

## Query Patterns

### Get Latest Version of English Transcription

```sql
-- Get the most recent H-X version, or T-1 if no edits
SELECT 
  COALESCE(tv.edited_text, t.raw_text) as latest_text,
  COALESCE(tv.json_with_timestamps, t.json_with_timestamps) as timestamps,
  tv.version_number,
  tv.version_type
FROM transcriptions t
LEFT JOIN transcription_versions tv 
  ON t.id = tv.transcription_id
WHERE t.audio_file_id = $1
ORDER BY tv.version_number DESC NULLS LAST
LIMIT 1;
```

### Get All Translations for an English Transcription

```sql
SELECT 
  tr.language_code,
  COALESCE(trv.edited_text, tr.translated_text) as latest_text,
  trv.version_number,
  tr.dictionary_corrections_applied
FROM translations tr
LEFT JOIN translation_versions trv
  ON tr.id = trv.translation_id
WHERE tr.transcription_id = $1
ORDER BY tr.language_code, trv.version_number DESC NULLS LAST;
```

### Apply Dictionary to Text

```sql
SELECT term_original, term_corrected
FROM dictionary
WHERE language_code = 'en'
ORDER BY LENGTH(term_original) DESC; -- Longest terms first to avoid partial matches
```

### Get Feedback Summary

```sql
SELECT 
  summary_type,
  COUNT(*) as total_generated,
  COUNT(CASE WHEN user_edited_text IS NOT NULL THEN 1 END) as edited,
  AVG(LENGTH(generated_text) - LENGTH(user_edited_text)) as avg_length_change
FROM generated_summaries
WHERE finalized_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY summary_type;
```

---

## Performance Considerations

### Indexes Created

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Project queries
CREATE INDEX idx_projects_project_type ON projects(project_type_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Audio file queries
CREATE INDEX idx_audio_files_project ON audio_files(project_id);
CREATE INDEX idx_audio_files_uploaded_by ON audio_files(uploaded_by);
CREATE INDEX idx_audio_files_created_at ON audio_files(created_at DESC);

-- Transcription queries
CREATE INDEX idx_transcriptions_audio ON transcriptions(audio_file_id);
CREATE INDEX idx_trans_versions_transcription ON transcription_versions(transcription_id);
CREATE INDEX idx_trans_versions_edited_by ON transcription_versions(edited_by);

-- Dictionary queries
CREATE INDEX idx_dictionary_original ON dictionary(term_original);
CREATE INDEX idx_dictionary_language ON dictionary(language_code);
CREATE INDEX idx_dictionary_usage ON dictionary(usage_count DESC);

-- Translation queries
CREATE INDEX idx_translations_transcription ON translations(transcription_id);
CREATE INDEX idx_translations_language ON translations(language_code);
CREATE INDEX idx_trans_lang_versions_translation ON translation_versions(translation_id);

-- Summary queries
CREATE INDEX idx_summaries_transcription ON generated_summaries(transcription_id);
CREATE INDEX idx_summaries_type ON generated_summaries(summary_type);
CREATE INDEX idx_summaries_finalized ON generated_summaries(finalized_at);

-- Feedback queries
CREATE INDEX idx_feedback_summary ON feedback_log(summary_id);
CREATE INDEX idx_feedback_created_at ON feedback_log(created_at DESC);

-- Template queries
CREATE INDEX idx_templates_name ON prompt_templates(template_name);
CREATE INDEX idx_prompt_versions_template ON prompt_versions(template_id);
```

### Storage Optimization

- **Plain text + JSON:** Store both for search (text) and display (JSON)
- **Soft deletes:** Use `archived` flag instead of DELETE
- **JSONB for metadata:** Allows flexible future extensions
- **Diffs:** Store diff, not full versions, to save space (consider for future)

---

## Backup & Recovery

### Daily Backups

Supabase automatically backs up:
- All database tables
- Storage buckets

Retention: 7 days (configurable)

### Recovery Scenarios

**Scenario 1: User accidentally deletes transcription**
```sql
-- Soft delete (doesn't lose data)
UPDATE transcriptions SET archived = TRUE WHERE id = $1;
-- Can restore if needed
UPDATE transcriptions SET archived = FALSE WHERE id = $1;
```

**Scenario 2: Need to revert to previous prompt**
```sql
-- Get previous version
SELECT template_content FROM prompt_versions 
WHERE template_id = $1 AND version_number = 2;

-- Revert
UPDATE prompt_templates 
SET template_content = (SELECT template_content FROM prompt_versions WHERE template_id = $1 AND version_number = 2)
WHERE id = $1;
```

**Scenario 3: Rollback to previous transcription version**
```sql
-- Get previous H-X version
SELECT edited_text FROM transcription_versions
WHERE transcription_id = $1 AND version_number = 1;

-- User can manually restore if needed (UI will provide this)
```

---

## Future Extensibility

### Adding New Features

**Multiple Speakers:**
- Add `speaker_name` field to transcriptions JSON
- Create speakers table to map speaker IDs to names
- Update dictionary to support speaker-specific terms

**Custom Languages:**
- Add new language_code to translations table
- Seed new language in language_codes table
- Add to UI dropdown

**Approval Workflows:**
- Add `approved_by` and `approved_at` to transcription_versions
- Create approval_log table to track review process
- Add `requires_approval` flag to projects

**Multi-User Collaboration:**
- Add `locked_by` to transcriptions during editing
- Add `comment` table for threaded discussions
- Add real-time sync via WebSockets