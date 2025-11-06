# Complete Workflow: Files Generated & Storage Locations
## Step-by-Step Guide with Supabase Storage & Database Details

**Last Updated:** November 6, 2025  
**Purpose:** Document exactly what files are created at each step and where they are stored in Supabase  
**Recent Updates:** Translation segment alignment improvements (v2.1.0)

---

## Questions & Answers

### Q1: PROJECT PURPOSE
**Statement:** "REMEMBER THAT THIS ENTIRE PROJECT IS TO IN THE MOST ACCURATE WAY POSSIBLE - CREATE SPOKE WORD OF IDENTICAL LENGTH IN MULTIPLE LANGUAGES SO THAT THEY CAN BE OVERLAPPED ONTO EXISTING VIDEO CONTENT."

**Answer:** Yes, this is the core purpose. The workflow ensures:
- Timestamps are preserved from original transcription through all versions
- Translation segments maintain same start/end times as English segments
- **CRITICAL (v2.1.0)**: Translation segments have identical IDs, timestamps, and seek values as English segments for perfect 1:1 alignment
- Generated speech uses preserved timestamps to match original video timing
- Final output: Translated audio files with identical timing to original, ready for video overlay

---

### Q2: SONIX ORIGINAL FILE DOWNLOAD
**Question:** "DOES THE SONIX API ALLOW THE ORIGINAL AUDIO/VIDEO TO BE HARVESTED SO THAT I CAN BE PUT INTO SUPABASE?"

**Answer:** **Currently NO** - The Sonix import only retrieves:
- Transcript JSON (segments with timestamps)
- Media metadata (name, duration, status)
- **NOT the original media file**

**Current Implementation:**
- Sonix API provides `public_url` for viewing, but no direct download endpoint
- Original files remain in Sonix's storage
- We only store transcript data in Supabase database

**Potential Solution:**
- Need to check Sonix API documentation for media download endpoint
- If available, we can add download functionality to import original files
- Files would be stored in `max-audio` bucket with path: `audio/{project_type}/sonix-{media_id}-{filename}`

**Action Item:** Check Sonix API v1 documentation for `/media/{id}/download` or similar endpoint

---

### Q3: SONIX DATA SCHEMA
**Question:** "IS THE SUPABASE DATABASE SCHEMA DESIGNED TO MANAGE ALL THE DATA/DATA STYLES FROM SONIX OR ONLY SELECT DATA?"

**Answer:** **SELECT DATA** - We store only what's needed:

**What We Store:**
- `segments[]` - Array of transcript segments with:
  - `start_time` / `end_time` (or `start` / `end`)
  - `text` - Segment text
  - `words[]` - Word-level timestamps (if available)
- `full_text` - Complete transcript text
- Media metadata: `name`, `duration`, `status`, `video` flag

**What We DON'T Store:**
- Speaker identification (if multi-speaker)
- Custom metadata from Sonix
- Quality scores
- Processing timestamps
- Original file references (only transcript data)

**Data Structure:**
- Sonix data is converted to our format via `convertSonixJSONToMaxFormat()`
- Stored in `max_transcriptions.json_with_timestamps` (JSONB)
- Compatible with both Sonix and Whisper formats

---

### Q4: TIMESTAMP SEGMENTATION
**Statement:** "THE TIMESTAMPS - THERE ARE TWO NEEDS: SHORT SEGMENTS TO FACILITATE EDITING; LARGE EN BLOC STYLE FOR RAG PURPOSES"

**Answer:** **Both are supported:**

**1. Short Segments (Editing):**
- **Location:** `json_with_timestamps.segments[]` in database
- **Format:** Sentence-level or word-level segments (1-2 sentences each)
- **Used For:** 
  - Text Translations tab editing
  - Side-by-side editor
  - Line-by-line comparison
- **Storage:** Same database field, split dynamically in UI

**2. Large En Bloc (RAG):**
- **Location:** `insight_chunks` table (RAG system)
- **Format:** 500-800 token chunks with semantic boundaries
- **Used For:**
  - RAG indexing
  - Semantic search
  - Content generation
- **Storage:** Separate table optimized for RAG

**Implementation:**
- Short segments: Split by sentences in UI (`splitSegmentsBySentences()`)
- Large chunks: Created via `/api/insight/chunk` endpoint
- Both reference same source transcription/version

---

### Q5: TRANSCRIPT LENGTH LIMITS
**Question:** "FOR STEP 3 - ARE THERE LIMITS TO THE LENGTH OF TRANSCRIPTS?"

**Answer:** **Yes, there are limits:**

**Whisper API:**
- **File Size:** 25 MB maximum
- **Duration:** ~25 minutes (depending on quality)
- **Text Length:** No hard limit, but longer = more tokens = higher cost

**Sonix:**
- **File Size:** Varies by plan (typically 2GB+)
- **Duration:** No hard limit mentioned
- **Text Length:** No limit in our storage

**Database Storage:**
- **TEXT column:** Unlimited (PostgreSQL)
- **JSONB column:** Practical limit ~1GB per record
- **Realistic limit:** Transcripts up to several hours work fine

**Current Implementation:**
- Whisper: 25 MB file size limit enforced
- Sonix: No file size limit (handled by Sonix)
- Database: No explicit limits set

---

### Q6: H-VERSION STORAGE
**Question:** "FOR STEP 4 - ALL THE H-VERSIONS NEED TO BE SAVED - CONFIRM THAT EACH IS STORED IN SUPABASE"

**Answer:** **YES - All H-versions are permanently stored:**

**Storage Location:**
- **Table:** `max_transcription_versions`
- **One record per H-version:**
  - H-1 → 1 database record
  - H-2 → 1 database record
  - H-3 → 1 database record
  - etc.

**What's Stored:**
- `version_number`: Sequential (1, 2, 3...)
- `version_type`: "H-1", "H-2", "H-3"...
- `edited_text`: Complete text
- `json_with_timestamps`: All segments with timestamps
- `dictionary_corrections_applied`: Tracked edits
- `edited_by`: User who created it
- `created_at`: Timestamp

**Permanence:**
- Versions are **never deleted** (only archived)
- Full audit trail maintained
- Can view/restore any previous version

---

### Q7: TRANSLATION FILE SYNTAX
**Question:** "WHAT IS THE SYNTAX FOR THE TRANSLATION FILES - DO THEY HAVE A COMMON NOMENCLATURE TO THE ORIGINAL ENGLISH VERSION"

**Answer:** **YES - Translation versions follow a pattern:**

**English Version Syntax:**
- T-1 (Original transcription)
- H-1, H-2, H-3... (Human-edited versions)

**Translation Version Syntax:**
- `H-{language_code}-{version_number}`
- Examples:
  - Spanish: `H-sp-1`, `H-sp-2`, `H-sp-3`
  - French: `H-fr-1`, `H-fr-2`, `H-fr-3`
  - Portuguese: `H-pr-1`, `H-pr-2`, `H-pr-3`
  - Hindi: `H-hi-1`, `H-hi-2`, `H-hi-3`

**Language Codes:**
- `sp` = Spanish
- `fr` = French
- `pr` = Portuguese
- `ar` = Arabic
- `ge` = German
- `it` = Italian
- `ma` = Mandarin
- `ja` = Japanese
- `hi` = Hindi

**Storage:**
- `max_translation_versions.version_type` column
- Example: `"H-sp-2"` means Spanish, second version

**Relationship:**
- Translation versions are independent of English versions
- But they reference which English H-version was used via `source_transcription_version_id`

---

### Q8: INDIVIDUAL LANGUAGE PROMOTION
**Statement:** "STEP 8 NEEDS TO INDIVIDUAL LANGUAGES PROMOTION TO SPEECH TRANSLATIONS - I DON'T WANT IT TO BE ALL LANGUAGES AT ONCE"

**Answer:** **Already implemented - Individual language promotion:**

**Current Implementation:**
- Each language has its own "Promote to Speech Translation" button
- Located in Text Translations tab, per-language
- Only promotes that specific language

**Workflow:**
1. Edit Spanish translation → Click "Promote to Speech Translation" (Spanish only)
2. Edit Portuguese translation → Click "Promote to Speech Translation" (Portuguese only)
3. Generate speech individually for each promoted language

**Storage:**
- `max_translations.final_version_id` is set per language
- Speech generation checks `final_version_id` for each language separately

**Confirmation:** ✅ Already working as requested

---

### Q9: PRIMARY LANGUAGES (PORTUGUESE & HINDI)
**Statement:** "THE MAIN CURRENT PROCESS WILL BE TO CREATE PORTUGUESE AND HINDI CONTENT - SO THESE ARE THE LANGUAGES THAT ULTIMATELY WILL GO THROUGH THE WHOLE WORKFLOW. I WANT TO BE ABLE TO IN THE FUTURE TAKE THE TEXT TRANSLATIONS AND INDIVIDUALLY EDIT THEM AND HAVE THEM IN THOSE LANGUAGES IN SPOKEN FORM."

**Answer:** **Fully supported:**

**Portuguese (`pr`):**
- Translation: ✅ Supported
- Editing: ✅ Text Translations tab with side-by-side editor
- Speech Generation: ✅ ElevenLabs voice (Bella - `EXAVITQu4vr4xnSDxMaL`)
- Versioning: ✅ H-pr-1, H-pr-2, etc.

**Hindi (`hi`):**
- Translation: ✅ Supported
- Editing: ✅ Text Translations tab with side-by-side editor
- Speech Generation: ✅ ElevenLabs voice (Bella - `EXAVITQu4vr4xnSDxMaL`)
- Versioning: ✅ H-hi-1, H-hi-2, etc.

**Workflow:**
1. Generate translations (Portuguese & Hindi)
2. Edit individually in Text Translations tab
3. Promote to Speech Translation (per language)
4. Generate speech (per language)
5. Download audio files for video overlay

**Future Editing:**
- All translations stored permanently
- Can edit any version at any time
- New versions create H-pr-3, H-pr-4, etc.
- Old versions remain archived

---

### Q10: ELEVENLABS VOICE CLONING (KARLA)
**Question:** "HOW DO I TRAIN ELEVENLABS TO SPEAK SIMILARILY TO KARLA IN OTHER LANGUAGES? LIKE HER INFLECTION, INTONATION, ETC?"

**Answer:** **Requires ElevenLabs Voice Cloning:**

**Current Implementation:**
- Uses preset voices (Bella, Serena, etc.)
- No voice cloning configured yet

**Voice Cloning Process:**
1. **Create Voice Clone (English):**
   - Upload 1+ minute of Karla's voice samples
   - ElevenLabs creates voice clone
   - Get `voice_id` for cloned voice

2. **Use Cloned Voice for Multilingual:**
   - ElevenLabs cloned voices support multilingual
   - Use `modelId: 'eleven_multilingual_v2'`
   - Voice clone maintains Karla's characteristics
   - Works for Portuguese, Hindi, and other languages

3. **Implementation Steps:**
   - Create voice clone via ElevenLabs dashboard or API
   - Update `voiceMap` in `/api/speech/generate/route.ts`:
     ```typescript
     const voiceMap: Record<string, string> = {
       'sp': 'karla-voice-id', // Karla clone for Spanish
       'pr': 'karla-voice-id', // Karla clone for Portuguese
       'hi': 'karla-voice-id', // Karla clone for Hindi
       // ... other languages
     }
     ```

4. **Voice Cloning Requirements:**
   - Minimum 1 minute of high-quality audio
   - Clear speech, minimal background noise
   - Multiple samples recommended for better quality
   - ElevenLabs Instant Voice Cloning (requires subscription)

**Action Item:** 
- Set up ElevenLabs voice cloning for Karla
- Update voice mapping in code
- Test with Portuguese and Hindi translations

---

## Storage Overview

### Supabase Storage Buckets
- **`max-audio`** - Original audio/video files
- **`generated-speech`** - Translated audio files from ElevenLabs

### Database Tables
- **`max_projects`** - Project metadata
- **`max_audio_files`** - Audio file records
- **`max_transcriptions`** - T-1 (original transcription)
- **`max_transcription_versions`** - H-1, H-2, H-3... (edited versions)
- **`max_translations`** - Translation records (one per language)
- **`max_translation_versions`** - H-{lang}-1, H-{lang}-2... (edited translations)
- **`max_generated_speech`** - Generated audio files

---

## Step-by-Step Workflow

### STEP 1: Create Project

**User Action:** Click "New Project" → Select project type → Enter name → Submit

**Files Generated:**
- **Database Record:** `max_projects` table
  - `id`: UUID (e.g., `abc-123-def-456`)
  - `name`: "Q3 2025 Lecture Series"
  - `project_type_id`: UUID reference to project type
  - `metadata`: JSONB `{location: "SF", date: "2025-01-15"}`
  - `created_by`: User UUID
  - `created_at`: Timestamp

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Table:** `max_projects`
- **No files in storage** (metadata only)

**Example:**
```sql
-- Database Record Created
INSERT INTO max_projects (id, name, project_type_id, created_by)
VALUES ('abc-123-def-456', 'Q3 2025 Lecture Series', 'lecture-uuid', 'user-uuid');
```

---

### STEP 2: Upload Audio/Video File

**User Action:** Select file → Click "Upload"

**Files Generated:**
1. **Storage File:** Audio/video file in Supabase Storage
   - **Bucket:** `max-audio`
   - **Path:** `audio/{project_type_slug}/{timestamp}-{original_filename}`
   - **Example:** `audio/lecture/1705324800000-dr-soto-lecture.mp3`
   - **File Size:** Original file size (e.g., 45.2 MB)
   - **Public URL:** `https://[project].supabase.co/storage/v1/object/public/max-audio/audio/lecture/1705324800000-dr-soto-lecture.mp3`

2. **Database Record:** `max_audio_files` table
   - `id`: UUID (e.g., `file-abc-123`)
   - `project_id`: UUID (from Step 1)
   - `file_name`: "dr-soto-lecture.mp3"
   - `file_path`: "audio/lecture/1705324800000-dr-soto-lecture.mp3"
   - `file_size_bytes`: 47362816
   - `duration_seconds`: 1800.5 (if available)
   - `uploaded_by`: User UUID
   - `created_at`: Timestamp

**Storage Location:**
- **Physical File:** Supabase Storage Bucket `max-audio`
- **Full Path in Storage:** `audio/lecture/1705324800000-dr-soto-lecture.mp3`
- **Database Reference:** `max_audio_files` table

**Example:**
```sql
-- Database Record Created
INSERT INTO max_audio_files (id, project_id, file_name, file_path, file_size_bytes, uploaded_by)
VALUES (
  'file-abc-123',
  'abc-123-def-456',
  'dr-soto-lecture.mp3',
  'audio/lecture/1705324800000-dr-soto-lecture.mp3',
  47362816,
  'user-uuid'
);
```

---

### STEP 3: Generate Transcription (T-1)

**User Action:** Click "Transcribe" → Select source (Whisper or Sonix)

**Files Generated:**
1. **Database Record:** `max_transcriptions` table
   - `id`: UUID (e.g., `trans-abc-123`)
   - `audio_file_id`: UUID (from Step 2)
   - `transcription_type`: "T-1"
   - `source`: "whisper" or "sonix"
   - `raw_text`: Complete transcript text (e.g., 5000 characters)
   - `json_with_timestamps`: JSONB with segments and word-level timestamps
   - `created_by`: User UUID
   - `final_version_id`: NULL (initially)
   - `created_at`: Timestamp

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Table:** `max_transcriptions`
- **JSON Data:** Stored in `json_with_timestamps` column (JSONB)
- **No separate files in storage** (data stored in database)

**Example JSON Structure:**
```json
// Stored in max_transcriptions.json_with_timestamps
{
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 5.2,
      "text": "Welcome to today's lecture on dental implants.",
      "words": [
        {"word": "Welcome", "start": 0.0, "end": 0.5},
        {"word": "to", "start": 0.5, "end": 0.7},
        ...
      ]
    },
    ...
  ]
}
```

**Database Record:**
```sql
-- Database Record Created
INSERT INTO max_transcriptions (
  id, audio_file_id, transcription_type, source, raw_text, json_with_timestamps, created_by
)
VALUES (
  'trans-abc-123',
  'file-abc-123',
  'T-1',
  'whisper',
  'Welcome to today's lecture...',
  '{"segments": [...]}'::jsonb,
  'user-uuid'
);
```

---

### STEP 4: Edit Transcription (Create H-1)

**User Action:** Go to "Edits" tab → Edit segments → Click "Save Version"

**Files Generated:**
1. **Database Record:** `max_transcription_versions` table
   - `id`: UUID (e.g., `version-abc-123`)
   - `transcription_id`: UUID (from Step 3)
   - `version_number`: 1
   - `version_type`: "H-1"
   - `edited_text`: Complete edited transcript text
   - `json_with_timestamps`: JSONB with edited segments
   - `dictionary_corrections_applied`: JSONB array of edits made
   - `edited_by`: User UUID
   - `created_at`: Timestamp

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Table:** `max_transcription_versions`
- **No separate files in storage** (data stored in database)

**Example:**
```sql
-- Database Record Created
INSERT INTO max_transcription_versions (
  id, transcription_id, version_number, version_type, edited_text, json_with_timestamps, edited_by
)
VALUES (
  'version-abc-123',
  'trans-abc-123',
  1,
  'H-1',
  'Welcome to today's lecture on dental implants. Today we will discuss...',
  '{"segments": [...]}'::jsonb,
  'user-uuid'
);
```

**If you edit again:**
- **H-2:** New record in `max_transcription_versions` with `version_number: 2`, `version_type: "H-2"`
- **H-3:** New record with `version_number: 3`, `version_type: "H-3"`
- Each edit creates a new version record (no deletion)

---

### STEP 5: Mark Version as "Ready to Translate"

**User Action:** Click "Ready to Translate" button on H-2 (or any H-version)

**Files Generated:**
- **Database Update:** `max_transcriptions` table
  - `final_version_id`: Updated to UUID of selected version (e.g., `version-abc-123` for H-2)
  - If H-2 selected: `final_version_id = 'version-abc-123'`
  - If T-1 selected: `final_version_id = NULL`

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Table:** `max_transcriptions` (column update)
- **No new files created** (just updates existing record)

**Example:**
```sql
-- Database Update
UPDATE max_transcriptions
SET final_version_id = 'version-abc-123'
WHERE id = 'trans-abc-123';
```

---

### STEP 6: Generate Translations

**User Action:** Go to "Text Translations" tab → Click "Batch Translate"

**Files Generated (per language):**

1. **Database Record:** `max_translations` table (one per language)
   - `id`: UUID (e.g., `translation-sp-123`)
   - `transcription_id`: UUID (from Step 3)
   - `language_code`: "sp" (Spanish), "fr" (French), etc.
   - `translated_text`: Complete translated text
   - `json_with_timestamps`: JSONB with translated segments
     - **CRITICAL (v2.1.0)**: Each segment has identical `id`, `start`, `end`, and `seek` values as the corresponding English segment
     - Only the `text` field is translated; all other properties match English exactly
   - `source_transcription_version_id`: UUID of H-version used (from Step 5, NULL for T-1)
   - `is_archived`: false (new translations are always current)
   - `final_version_id`: UUID of initial translation version (or NULL)
   - `created_at`: Timestamp

2. **Database Record:** `max_translation_versions` table (initial auto-translation)
   - `id`: UUID (e.g., `trans-version-sp-123`)
   - `translation_id`: UUID (from above)
   - `version_number`: 1
   - `version_type`: "H-sp-1" (for Spanish), "H-fr-1" (for French), etc.
   - `edited_text`: Auto-translated text
   - `json_with_timestamps`: JSONB with translated segments
   - `edited_by`: System user UUID
   - `created_at`: Timestamp

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Tables:** `max_translations` + `max_translation_versions`
- **No separate files in storage** (data stored in database)

**Example (Spanish):**
```sql
-- Translation Record Created
INSERT INTO max_translations (
  id, transcription_id, language_code, translated_text, json_with_timestamps, 
  source_transcription_version_id, is_archived, final_version_id
)
VALUES (
  'translation-sp-123',
  'trans-abc-123',
  'sp',
  'Bienvenido a la conferencia de hoy sobre implantes dentales...',
  '{"segments": [...]}'::jsonb,
  'version-abc-123',  -- H-2 UUID
  false,
  'trans-version-sp-123'
);

-- Initial Translation Version Created
INSERT INTO max_translation_versions (
  id, translation_id, version_number, version_type, edited_text, json_with_timestamps, edited_by
)
VALUES (
  'trans-version-sp-123',
  'translation-sp-123',
  1,
  'H-sp-1',
  'Bienvenido a la conferencia de hoy sobre implantes dentales...',
  '{"segments": [...]}'::jsonb,
  'system-uuid'
);
```

**Repeated for each language:**
- Spanish: `translation-sp-123`, `H-sp-1`
- French: `translation-fr-123`, `H-fr-1`
- Portuguese: `translation-pr-123`, `H-pr-1`
- Arabic: `translation-ar-123`, `H-ar-1`
- German: `translation-ge-123`, `H-ge-1`
- Italian: `translation-it-123`, `H-it-1`
- Mandarin: `translation-ma-123`, `H-ma-1`
- Japanese: `translation-ja-123`, `H-ja-1`
- Hindi: `translation-hi-123`, `H-hi-1`

---

### STEP 7: Edit Translation (Create H-{lang}-2)

**User Action:** Select language → Click "Edit" → Edit segments → Click "Save Version"

**Files Generated:**
1. **Database Record:** `max_translation_versions` table
   - `id`: UUID (e.g., `trans-version-sp-456`)
   - `translation_id`: UUID (from Step 6)
   - `version_number`: 2
   - `version_type`: "H-sp-2" (for Spanish)
   - `edited_text`: Complete edited translation text
   - `json_with_timestamps`: JSONB with edited segments
   - `edited_by`: User UUID
   - `created_at`: Timestamp

2. **Database Update:** `max_translations` table
   - `final_version_id`: Updated to new version UUID
   - `updated_at`: Timestamp updated

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Table:** `max_translation_versions` (new record)
- **Table:** `max_translations` (updated)
- **No separate files in storage** (data stored in database)

**Example (Spanish):**
```sql
-- New Translation Version Created
INSERT INTO max_translation_versions (
  id, translation_id, version_number, version_type, edited_text, json_with_timestamps, edited_by
)
VALUES (
  'trans-version-sp-456',
  'translation-sp-123',
  2,
  'H-sp-2',
  'Bienvenido a la conferencia de hoy sobre implantes dentales. Hoy discutiremos...',
  '{"segments": [...]}'::jsonb,
  'user-uuid'
);

-- Translation Record Updated
UPDATE max_translations
SET final_version_id = 'trans-version-sp-456', updated_at = NOW()
WHERE id = 'translation-sp-123';
```

**If you edit again:**
- **H-sp-3:** New record with `version_number: 3`, `version_type: "H-sp-3"`
- Each edit creates a new version record

---

### STEP 8: Promote to Speech Translation

**User Action:** Click "Promote to Speech Translation" button

**Files Generated:**
- **Database Update:** `max_translations` table
  - `final_version_id`: Ensured to point to latest version (if not already)
  - No new files created

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Table:** `max_translations` (column update)
- **No new files created** (just ensures final_version_id is set)

---

### STEP 9: Generate Speech (ElevenLabs)

**User Action:** Go to "Speech Translations" tab → Click "Generate Speech" for a language

**Files Generated:**
1. **Storage File:** Audio file in Supabase Storage
   - **Bucket:** `generated-speech`
   - **Path:** `{translation_id}/{language_code}-{timestamp}.mp3`
   - **Example:** `translation-sp-123/sp-1705324800000.mp3`
   - **File Size:** Varies (typically 500KB - 5MB per minute)
   - **Public URL:** `https://[project].supabase.co/storage/v1/object/public/generated-speech/translation-sp-123/sp-1705324800000.mp3`

2. **Database Record:** `max_generated_speech` table
   - `id`: UUID (e.g., `speech-abc-123`)
   - `translation_id`: UUID (from Step 6)
   - `language_code`: "sp"
   - `audio_url`: Full storage URL
   - `text_used`: Translation text that was converted to speech
   - `version_used`: "H-sp-2" (version that was used)
   - `status`: "completed"
   - `created_at`: Timestamp

**Storage Location:**
- **Physical File:** Supabase Storage Bucket `generated-speech`
- **Full Path in Storage:** `translation-sp-123/sp-1705324800000.mp3`
- **Database Reference:** `max_generated_speech` table

**Example:**
```sql
-- Database Record Created
INSERT INTO max_generated_speech (
  id, translation_id, language_code, audio_url, text_used, version_used, status
)
VALUES (
  'speech-abc-123',
  'translation-sp-123',
  'sp',
  'https://[project].supabase.co/storage/v1/object/public/generated-speech/translation-sp-123/sp-1705324800000.mp3',
  'Bienvenido a la conferencia de hoy...',
  'H-sp-2',
  'completed'
);
```

**Repeated for each language:**
- Spanish: `translation-sp-123/sp-1705324800000.mp3`
- French: `translation-fr-123/fr-1705324900000.mp3`
- etc.

---

### STEP 10: Create New English Version After Translation

**User Action:** Go back to "Edits" tab → Edit further → Click "Save Version" → Creates H-3

**Files Generated:**
1. **Database Record:** `max_transcription_versions` table
   - `id`: UUID (e.g., `version-xyz-789`)
   - `transcription_id`: UUID (same as Step 3)
   - `version_number`: 3
   - `version_type`: "H-3"
   - `edited_text`: Complete edited text
   - `json_with_timestamps`: JSONB with edited segments
   - `edited_by`: User UUID
   - `created_at`: Timestamp

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Table:** `max_transcription_versions`
- **No separate files in storage**

**Note:** Old translations (based on H-2) remain in database. They are NOT deleted.

---

### STEP 11: Mark New Version as "Ready to Translate"

**User Action:** Click "Ready to Translate" on H-3

**Files Generated:**
1. **Database Update:** `max_transcriptions` table
   - `final_version_id`: Updated to H-3 UUID (e.g., `version-xyz-789`)

2. **Database Update:** `max_translations` table (for all existing translations)
   - `is_archived`: Updated to `true` for all translations based on old H-version (H-2)
   - Old translations remain in database but are marked as archived

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Tables:** `max_transcriptions` (updated), `max_translations` (updated)
- **No new files created**

**Example:**
```sql
-- Update final version
UPDATE max_transcriptions
SET final_version_id = 'version-xyz-789'  -- H-3 UUID
WHERE id = 'trans-abc-123';

-- Archive old translations
UPDATE max_translations
SET is_archived = true
WHERE transcription_id = 'trans-abc-123'
  AND source_transcription_version_id = 'version-abc-123';  -- Old H-2 UUID
```

---

### STEP 12: Generate New Translations from New Version

**User Action:** Go to "Text Translations" tab → Click "Batch Translate" again

**Files Generated:**
1. **Database Records:** `max_translations` table (new records, one per language)
   - Same structure as Step 6
   - `source_transcription_version_id`: H-3 UUID (new version)
   - `is_archived`: false (new translations)

2. **Database Records:** `max_translation_versions` table (initial auto-translations)
   - Same structure as Step 6
   - `version_type`: "H-sp-1", "H-fr-1", etc. (new set, starts from 1 again)

**Storage Location:**
- **Location:** PostgreSQL Database (Supabase)
- **Tables:** `max_translations` + `max_translation_versions`
- **No separate files in storage**

**Result:**
- You now have TWO sets of translations:
  - **Old set:** Based on H-2, `is_archived = true`
  - **New set:** Based on H-3, `is_archived = false`
- Both sets remain in database
- UI shows latest (non-archived) set by default

---

## Complete File Structure Summary

### Supabase Storage Buckets

#### Bucket: `max-audio`
**Purpose:** Original audio/video files  
**Path Structure:** `audio/{project_type}/{timestamp}-{filename}`

**Example Files:**
```
max-audio/
  audio/
    lecture/
      1705324800000-dr-soto-lecture.mp3
      1705324900000-q3-updates.mp3
    webinar/
      1705325000000-dental-tech-2025.mp3
    podcast/
      1705325100000-episode-5.mp3
```

#### Bucket: `generated-speech`
**Purpose:** Translated audio files from ElevenLabs  
**Path Structure:** `{translation_id}/{language_code}-{timestamp}.mp3`

**Example Files:**
```
generated-speech/
  translation-sp-123/
    sp-1705324800000.mp3
  translation-fr-123/
    fr-1705324900000.mp3
  translation-pr-123/
    pr-1705325000000.mp3
```

---

### Database Tables

#### `max_projects`
**Purpose:** Project metadata  
**No file storage** - metadata only

#### `max_audio_files`
**Purpose:** References to audio files in storage  
**Storage:** References files in `max-audio` bucket  
**Key Fields:**
- `file_path`: Path to file in storage
- `file_name`: Original filename

#### `max_transcriptions`
**Purpose:** T-1 (original transcription)  
**Storage:** JSONB in database (no separate files)  
**Key Fields:**
- `raw_text`: Complete transcript
- `json_with_timestamps`: Segments with timestamps

#### `max_transcription_versions`
**Purpose:** H-1, H-2, H-3... (edited versions)  
**Storage:** JSONB in database (no separate files)  
**Key Fields:**
- `version_type`: "H-1", "H-2", etc.
- `edited_text`: Complete edited text
- `json_with_timestamps`: Edited segments

#### `max_translations`
**Purpose:** Translation records (one per language)  
**Storage:** JSONB in database (no separate files)  
**Key Fields:**
- `language_code`: "sp", "fr", etc.
- `translated_text`: Complete translation
- `json_with_timestamps`: Translated segments
- `source_transcription_version_id`: Which H-version was used
- `is_archived`: Whether translation is outdated

#### `max_translation_versions`
**Purpose:** H-sp-1, H-sp-2... (edited translations)  
**Storage:** JSONB in database (no separate files)  
**Key Fields:**
- `version_type`: "H-sp-1", "H-sp-2", etc.
- `edited_text`: Complete edited translation
- `json_with_timestamps`: Edited segments

#### `max_generated_speech`
**Purpose:** References to generated audio files  
**Storage:** References files in `generated-speech` bucket  
**Key Fields:**
- `audio_url`: Full URL to audio file
- `translation_id`: Which translation was used
- `version_used`: Which translation version was used

---

## Complete Workflow Example

### Example: Complete Journey of One Audio File

**Starting Point:**
- Project: "Q3 2025 Lecture Series"
- Audio File: "dr-soto-lecture.mp3" (45 MB)

**Files Created Throughout:**

1. **Project Created:**
   - Database: `max_projects` → 1 record

2. **Audio Uploaded:**
   - Storage: `max-audio/audio/lecture/1705324800000-dr-soto-lecture.mp3` → 1 file (45 MB)
   - Database: `max_audio_files` → 1 record

3. **Transcription Generated:**
   - Database: `max_transcriptions` → 1 record (T-1)
   - Data: JSONB with ~200 segments

4. **First Edit (H-1):**
   - Database: `max_transcription_versions` → 1 record (H-1)

5. **Second Edit (H-2):**
   - Database: `max_transcription_versions` → 1 record (H-2)
   - Total: 2 version records

6. **Marked Ready to Translate:**
   - Database: `max_transcriptions.final_version_id` → Updated to H-2 UUID

7. **Translations Generated (9 languages):**
   - Database: `max_translations` → 9 records (one per language)
   - Database: `max_translation_versions` → 9 records (initial auto-translations)

8. **Spanish Translation Edited (H-sp-2):**
   - Database: `max_translation_versions` → 1 record (H-sp-2)
   - Total: 10 translation version records

9. **Speech Generated (Spanish):**
   - Storage: `generated-speech/translation-sp-123/sp-1705324800000.mp3` → 1 file (2.5 MB)
   - Database: `max_generated_speech` → 1 record

10. **Third Edit (H-3):**
    - Database: `max_transcription_versions` → 1 record (H-3)
    - Total: 3 version records

11. **Marked Ready to Translate (H-3):**
    - Database: `max_translations` → 9 records updated (`is_archived = true`)

12. **New Translations Generated (9 languages):**
    - Database: `max_translations` → 9 NEW records (one per language)
    - Database: `max_translation_versions` → 9 NEW records
    - Total: 18 translation records, 19 translation version records

**Final Count:**
- **Storage Files:** 2 files
  - 1 original audio (45 MB)
  - 1 generated speech (2.5 MB)
- **Database Records:**
  - 1 project
  - 1 audio file
  - 1 transcription
  - 3 transcription versions (H-1, H-2, H-3)
  - 18 translation records (9 old archived + 9 new)
  - 19 translation versions
  - 1 generated speech record

---

## Key Storage Locations Quick Reference

| Item | Storage Type | Location |
|------|--------------|----------|
| **Original Audio** | Supabase Storage | `max-audio/audio/{project_type}/{timestamp}-{filename}` |
| **Transcription Data (T-1)** | Database (JSONB) | `max_transcriptions.json_with_timestamps` |
| **Version Data (H-1, H-2...)** | Database (JSONB) | `max_transcription_versions.json_with_timestamps` |
| **Translation Data** | Database (JSONB) | `max_translations.json_with_timestamps` |
| **Translation Version Data** | Database (JSONB) | `max_translation_versions.json_with_timestamps` |
| **Generated Speech** | Supabase Storage | `generated-speech/{translation_id}/{lang}-{timestamp}.mp3` |

---

## Summary

**Physical Files (Storage):**
- Audio files: Stored in `max-audio` bucket
- Generated speech: Stored in `generated-speech` bucket

**Data Files (Database):**
- All transcription and translation text stored as JSONB in database
- No separate JSON files - data is embedded in database records
- Each version is a separate database record (not a separate file)

**Archival:**
- Old translations remain in database (`is_archived = true`)
- Old audio files remain in storage (never deleted automatically)
- Old speech files remain in storage (can be regenerated if needed)

