# Complete Transcription & Translation Workflow
## Max System - End-to-End Process Documentation

**Last Updated:** November 6, 2025  
**Purpose:** Complete workflow documentation for transcription, editing, translation, and speech generation  
**Recent Updates:** Translation segment alignment improvements (v2.1.0)

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow Stages](#workflow-stages)
3. [Version Types & Naming](#version-types--naming)
4. [Database Tables & Storage](#database-tables--storage)
5. [Tab-by-Tab Workflow](#tab-by-tab-workflow)
6. [Version Management](#version-management)
7. [File Storage](#file-storage)

---

## Overview

### Complete Workflow Flow

```
1. Audio/Video Upload
   ↓
2. Transcription (T-1)
   ↓
3. Editing (H-1, H-2, H-3...)
   ↓
4. Ready to Translate (Final Version Selection)
   ↓
5. Translation Generation (Auto-translated)
   ↓
6. Translation Editing (H-sp-1, H-sp-2...)
   ↓
7. Promote to Speech Translation
   ↓
8. Speech Generation (ElevenLabs)
```

---

## Workflow Stages

### Stage 1: Transcription

**Tab:** Original Transcript  
**Actions:**
- Upload audio/video file
- Select transcription source (Whisper or Sonix)
- Generate transcription

**Output:**
- **Version:** T-1 (Original Transcription)
- **Table:** `max_transcriptions`
- **Files Created:**
  - Audio file stored in Supabase Storage
  - Transcription JSON with timestamps

**Database Records:**
```sql
max_transcriptions:
  - id: UUID
  - audio_file_id: UUID
  - raw_text: TEXT (complete transcript)
  - json_with_timestamps: JSONB (segments with start/end times)
  - final_version_id: NULL (initially)
  - created_at: TIMESTAMP
```

---

### Stage 2: Editing English Transcript

**Tab:** Edits  
**Actions:**
- View side-by-side: T-1 (left) vs Editable (right)
- Edit segments line-by-line
- Click "Save Version" to create H-1
- Continue editing → "Save Version" → H-2, H-3, etc.

**Output:**
- **Versions:** H-1, H-2, H-3... (each save creates new version)
- **Table:** `max_transcription_versions`

**Database Records:**
```sql
max_transcription_versions (for each H-version):
  - id: UUID
  - transcription_id: UUID
  - version_number: INTEGER (1, 2, 3...)
  - version_type: TEXT ('H-1', 'H-2', 'H-3'...)
  - edited_text: TEXT (complete edited text)
  - json_with_timestamps: JSONB (edited segments)
  - dictionary_corrections_applied: JSONB (tracked edits)
  - edited_by: UUID
  - created_at: TIMESTAMP
```

**Version Naming:**
- H-1 = First edit
- H-2 = Second edit
- H-3 = Third edit
- etc.

---

### Stage 3: Ready to Translate

**Tab:** Edits  
**Actions:**
- Select any H-version (or T-1)
- Click "Ready to Translate" button
- This sets `final_version_id` on `max_transcriptions`

**Output:**
- **Status:** Version marked as "Ready for Translation"
- **Database:** `max_transcriptions.final_version_id` = UUID of selected version

**What Happens:**
- If `final_version_id = NULL` → T-1 is used for translation
- If `final_version_id = UUID` → That H-version is used for translation
- This becomes the "source of truth" for all translations

**Note:** This is a **critical decision point** - the selected version determines what gets translated.

---

### Stage 4: Translation Generation

**Tab:** Text Translations  
**Actions:**
- Click "Batch Translate" or select individual languages
- System uses the version marked "Ready to Translate" (from `final_version_id`)
- Claude generates translations for selected languages

**Output:**
- **Versions:** Auto-translated (no version number initially)
- **Table:** `max_translations` (one record per language)
- **Table:** `max_translation_versions` (initial auto-translation saved as version)

**Database Records:**
```sql
max_translations (one per language):
  - id: UUID
  - transcription_id: UUID
  - language_code: TEXT ('sp', 'fr', 'pr', 'ar', 'ge', 'it', 'ma', 'ja', 'hi')
  - translated_text: TEXT (complete translation)
  - json_with_timestamps: JSONB (translated segments)
  - source_transcription_version_id: UUID (which H-version was used)
  - is_archived: BOOLEAN (false initially)
  - final_version_id: UUID (latest translation version)
  - created_at: TIMESTAMP

max_translation_versions (initial auto-translation):
  - id: UUID
  - translation_id: UUID
  - version_number: INTEGER (1)
  - version_type: TEXT ('H-sp-1', 'H-fr-1', etc.)
  - edited_text: TEXT (auto-translated text)
  - json_with_timestamps: JSONB
  - edited_by: UUID (system)
  - created_at: TIMESTAMP
```

**Version Naming:**
- H-{lang}-1 = First translation (auto-generated)
- Example: H-sp-1 = Spanish, first version

**Source Tracking:**
- `source_transcription_version_id` stores which English H-version was used
- Example: If H-3 was "Ready to Translate", all translations store reference to H-3

---

### Stage 5: Translation Editing

**Tab:** Text Translations  
**Actions:**
- Select language from dropdown
- View side-by-side: English (left, read-only) vs Translation (right, editable)
- Segments are split into 1 sentence per block for easier editing
- **CRITICAL (v2.1.0)**: Left and right columns have identical timestamps - perfect alignment
- Uses word-level timestamps from Sonix/Whisper for accurate sentence boundaries
- Edit translation segments (each with matching timestamp to English)
- Click "Save Version" → Creates H-{lang}-2, H-{lang}-3, etc.

**Output:**
- **Versions:** H-sp-2, H-sp-3, H-fr-2, etc. (per language)
- **Table:** `max_translation_versions`

**Database Records:**
```sql
max_translation_versions (for each edit):
  - id: UUID
  - translation_id: UUID
  - version_number: INTEGER (2, 3, 4...)
  - version_type: TEXT ('H-sp-2', 'H-sp-3', etc.)
  - edited_text: TEXT (edited translation)
  - json_with_timestamps: JSONB (edited segments)
  - edited_by: UUID
  - created_at: TIMESTAMP
```

**Version Naming:**
- H-sp-1 = Spanish, first version (auto)
- H-sp-2 = Spanish, first edit
- H-sp-3 = Spanish, second edit
- H-fr-1 = French, first version (auto)
- H-fr-2 = French, first edit
- etc.

**Auto-Promotion:**
- When you save a new translation version, it's automatically marked as "final" for that language
- `max_translations.final_version_id` is updated to the latest version

---

### Stage 6: Promote to Speech Translation

**Tab:** Text Translations  
**Actions:**
- After editing translation, click "Promote to Speech Translation"
- This marks the translation as ready for speech generation

**Output:**
- **Status:** Translation marked as ready for speech
- **Database:** `max_translations.final_version_id` is set (if not already)

**What Happens:**
- The latest translation version is marked as final
- This version will be used for speech generation

---

### Stage 7: Speech Generation

**Tab:** Speech Translations  
**Actions:**
- View translations that have been "Promoted to Speech Translation"
- Click "Generate Speech" for each language
- System calls ElevenLabs API
- Audio file is generated and stored

**Output:**
- **Files:** Audio files (MP3/WAV) in Supabase Storage
- **Table:** `max_generated_speech`

**Database Records:**
```sql
max_generated_speech:
  - id: UUID
  - translation_id: UUID
  - language_code: TEXT
  - audio_url: TEXT (storage URL)
  - text_used: TEXT (translation text used for speech)
  - version_used: TEXT (H-sp-2, etc.)
  - status: TEXT ('pending', 'completed', 'failed')
  - created_at: TIMESTAMP
```

**Storage:**
- Audio files stored in Supabase Storage bucket
- URLs stored in database
- Can be downloaded or played in browser

---

## Version Types & Naming

### English Transcription Versions

| Version Type | Description | Source | Table |
|-------------|-------------|--------|-------|
| **T-1** | Original transcription (Whisper/Sonix) | Auto-generated | `max_transcriptions` |
| **H-1** | First human edit | User edits T-1 | `max_transcription_versions` |
| **H-2** | Second human edit | User edits H-1 | `max_transcription_versions` |
| **H-3** | Third human edit | User edits H-2 | `max_transcription_versions` |
| ... | ... | ... | ... |

### Translation Versions

| Version Type | Description | Source | Table |
|-------------|-------------|--------|-------|
| **H-{lang}-1** | Auto-translated (initial) | Claude from English Final | `max_translation_versions` |
| **H-{lang}-2** | First translation edit | User edits H-{lang}-1 | `max_translation_versions` |
| **H-{lang}-3** | Second translation edit | User edits H-{lang}-2 | `max_translation_versions` |
| ... | ... | ... | ... |

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

**Examples:**
- H-sp-1 = Spanish, first version
- H-fr-2 = French, second version
- H-pr-3 = Portuguese, third version

---

## Database Tables & Storage

### Core Tables

#### 1. `max_transcriptions`
**Purpose:** Stores original T-1 transcription  
**Key Columns:**
- `id` (UUID) - Primary key
- `audio_file_id` (UUID) - Links to audio file
- `raw_text` (TEXT) - Complete transcript
- `json_with_timestamps` (JSONB) - Timestamped segments
- `final_version_id` (UUID) - Which H-version is "Ready to Translate"
- `created_at` (TIMESTAMP)

#### 2. `max_transcription_versions`
**Purpose:** Stores H-1, H-2, H-3... versions  
**Key Columns:**
- `id` (UUID) - Primary key
- `transcription_id` (UUID) - Links to parent transcription
- `version_number` (INTEGER) - 1, 2, 3...
- `version_type` (TEXT) - 'H-1', 'H-2'...
- `edited_text` (TEXT) - Complete edited text
- `json_with_timestamps` (JSONB) - Edited segments
- `dictionary_corrections_applied` (JSONB) - Tracked edits
- `edited_by` (UUID) - User who edited
- `created_at` (TIMESTAMP)

#### 3. `max_translations`
**Purpose:** One record per language translation  
**Key Columns:**
- `id` (UUID) - Primary key
- `transcription_id` (UUID) - Links to English transcription
- `language_code` (TEXT) - 'sp', 'fr', etc.
- `translated_text` (TEXT) - Complete translation
- `json_with_timestamps` (JSONB) - Translated segments
- `source_transcription_version_id` (UUID) - **Which H-version was used**
- `is_archived` (BOOLEAN) - **True if outdated**
- `final_version_id` (UUID) - Latest translation version
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### 4. `max_translation_versions`
**Purpose:** Stores H-{lang}-1, H-{lang}-2... versions  
**Key Columns:**
- `id` (UUID) - Primary key
- `translation_id` (UUID) - Links to parent translation
- `version_number` (INTEGER) - 1, 2, 3...
- `version_type` (TEXT) - 'H-sp-1', 'H-sp-2'...
- `edited_text` (TEXT) - Complete edited translation
- `json_with_timestamps` (JSONB) - Edited segments
- `edited_by` (UUID) - User who edited
- `created_at` (TIMESTAMP)

#### 5. `max_generated_speech`
**Purpose:** Stores generated audio files  
**Key Columns:**
- `id` (UUID) - Primary key
- `translation_id` (UUID) - Links to translation
- `language_code` (TEXT) - 'sp', 'fr', etc.
- `audio_url` (TEXT) - Storage URL
- `text_used` (TEXT) - Translation text used
- `version_used` (TEXT) - H-sp-2, etc.
- `status` (TEXT) - 'pending', 'completed', 'failed'
- `created_at` (TIMESTAMP)

---

## Tab-by-Tab Workflow

### Tab 1: Original Transcript
**Purpose:** View the original T-1 transcription  
**Actions:**
- View raw transcript
- View timestamped segments
- No editing (read-only)

**Data Source:**
- `max_transcriptions.raw_text`
- `max_transcriptions.json_with_timestamps`

---

### Tab 2: Edits
**Purpose:** Edit English transcription  
**Actions:**
- Side-by-side view: T-1 (left) vs Editable (right)
- Edit segments
- Click "Save Version" → Creates H-1, H-2, etc.
- Click "Ready to Translate" → Sets `final_version_id`

**Data Source:**
- Left: `max_transcriptions` (T-1)
- Right: Editable (becomes H-version on save)
- Versions: `max_transcription_versions`

**Buttons:**
- "Save Version" → Creates new H-version
- "Ready to Translate" → Promotes version for translation

---

### Tab 3: Text Translations
**Purpose:** Translate and edit translations  
**Actions:**
- View which version is "Ready to Translate"
- Click "Batch Translate" → Generates all languages
- Select language from dropdown
- Side-by-side view: English (left) vs Translation (right)
- Segments split into 1-2 sentences
- Edit translation segments
- Click "Save Version" → Creates H-{lang}-2, H-{lang}-3...
- Click "Promote to Speech Translation" → Marks ready for speech

**Data Source:**
- English: `max_transcriptions` or `max_transcription_versions` (based on `final_version_id`)
- Translation: `max_translations` + `max_translation_versions`

**Buttons:**
- "Batch Translate" → Generates translations
- "Edit" → Opens side-by-side editor
- "Save Version" → Creates new translation version
- "Promote to Speech Translation" → Marks ready for speech

**Info Icon:**
- Shows which H-version was used as source
- Shows if translation is archived (outdated)

---

### Tab 4: Speech Translations
**Purpose:** Generate and manage speech  
**Actions:**
- View translations that are "Promoted to Speech Translation"
- Click "Generate Speech" → Calls ElevenLabs
- Play audio in browser
- Download audio file
- Download translation text (with timestamps)

**Data Source:**
- `max_translations` (filtered by `final_version_id` not null)
- `max_generated_speech`

**Buttons:**
- "Generate Speech" → Creates audio file
- "Regenerate" → Deletes old and creates new
- "Download Audio" → Downloads MP3/WAV
- "Download Text" → Downloads translation text

---

### Tab 5: Final
**Purpose:** View final English version  
**Actions:**
- View the version marked as "Final"
- Shows which H-version is final (or T-1)

**Data Source:**
- `max_transcriptions.final_version_id`
- If NULL → Shows T-1
- If UUID → Shows that H-version

---

### Tab 6: Analysis
**Purpose:** View AI-generated analysis  
**Actions:**
- View analysis of transcript
- Send to Insight system

**Data Source:**
- `max_transcription_analyses`

---

## Version Management

### English Transcription Version Flow

```
T-1 (Original)
  ↓
H-1 (First Edit)
  ↓
H-2 (Second Edit)
  ↓
H-3 (Third Edit)
  ↓
... (continue editing)
  ↓
"Ready to Translate" (Select H-3)
  ↓
final_version_id = H-3 UUID
```

**If you create H-4 after translating:**
- Old translations remain (based on H-3)
- New translations can be generated (based on H-4)
- Old translations marked as `is_archived = true`
- Info icon shows which H-version was used

---

### Translation Version Flow

```
English H-3 "Ready to Translate"
  ↓
Batch Translate (all languages)
  ↓
H-sp-1, H-fr-1, H-pr-1... (auto-generated)
  ↓
Edit Spanish → Save Version
  ↓
H-sp-2 (first edit)
  ↓
Edit Spanish → Save Version
  ↓
H-sp-3 (second edit)
  ↓
"Promote to Speech Translation"
  ↓
Generate Speech (uses H-sp-3)
```

---

### Multiple Translation Sets (When Source Changes)

**Scenario:** H-3 was translated, then H-4 is marked "Ready to Translate"

**What Happens:**
1. Old translations (based on H-3) remain in database
2. `is_archived = true` on old translations
3. New translations (based on H-4) can be generated
4. New translations have `is_archived = false`
5. Info icon shows which H-version each translation is based on
6. Latest translation (by `created_at`) is considered "current"

**Database State:**
```sql
-- Old translation (H-3 based)
max_translations:
  - source_transcription_version_id: H-3 UUID
  - is_archived: true
  - created_at: 2025-01-15

-- New translation (H-4 based)
max_translations:
  - source_transcription_version_id: H-4 UUID
  - is_archived: false
  - created_at: 2025-01-20
```

---

## File Storage

### Audio Files (Original)
**Location:** Supabase Storage  
**Path:** `/audio-files/{audio_file_id}`  
**Table:** `max_audio_files`  
**Purpose:** Original uploaded audio/video

### Transcription JSON
**Location:** Database (JSONB)  
**Table:** `max_transcriptions.json_with_timestamps`  
**Purpose:** Timestamped segments with text

### Generated Speech Files
**Location:** Supabase Storage  
**Path:** `/generated-speech/{speech_id}.mp3`  
**Table:** `max_generated_speech.audio_url`  
**Purpose:** Translated audio files from ElevenLabs

---

## Complete Workflow Example

### Step-by-Step Walkthrough

1. **Upload Audio**
   - File: `lecture.mp3`
   - Stored in Supabase Storage
   - Record in `max_audio_files`

2. **Generate Transcription**
   - Click "Transcribe"
   - Whisper processes audio
   - T-1 created in `max_transcriptions`
   - `final_version_id = NULL`

3. **Edit Transcript (First Time)**
   - Go to "Edits" tab
   - Edit segments
   - Click "Save Version"
   - H-1 created in `max_transcription_versions`
   - `final_version_id` still NULL

4. **Edit Transcript (Second Time)**
   - Continue editing
   - Click "Save Version"
   - H-2 created in `max_transcription_versions`
   - `final_version_id` still NULL

5. **Mark Ready to Translate**
   - Click "Ready to Translate" on H-2
   - `max_transcriptions.final_version_id = H-2 UUID`
   - H-2 is now the "source of truth"

6. **Generate Translations**
   - Go to "Text Translations" tab
   - Click "Batch Translate"
   - System uses H-2 as source
   - Creates:
     - `max_translations` records (one per language)
     - `max_translation_versions` (H-sp-1, H-fr-1, etc.)
     - Each translation stores `source_transcription_version_id = H-2 UUID`

7. **Edit Spanish Translation**
   - Select Spanish from dropdown
   - Click "Edit"
   - Side-by-side view (English H-2 vs Spanish H-sp-1)
   - Edit segments (1-2 sentences each)
   - Click "Save Version"
   - H-sp-2 created in `max_translation_versions`
   - `max_translations.final_version_id = H-sp-2 UUID` (auto-promoted)

8. **Promote to Speech**
   - Click "Promote to Speech Translation"
   - Marks translation as ready for speech

9. **Generate Speech**
   - Go to "Speech Translations" tab
   - Click "Generate Speech" for Spanish
   - ElevenLabs generates audio
   - Audio file stored in Supabase Storage
   - `max_generated_speech` record created
   - Audio URL stored, can be played/downloaded

10. **Create New English Version (H-3)**
    - Go back to "Edits" tab
    - Edit further
    - Click "Save Version"
    - H-3 created in `max_transcription_versions`
    - `final_version_id` still points to H-2

11. **Mark H-3 Ready to Translate**
    - Click "Ready to Translate" on H-3
    - `max_transcriptions.final_version_id = H-3 UUID`
    - Old translations (H-2 based) marked `is_archived = true`
    - Info icon shows "Based on H-2 (Archived)"

12. **Generate New Translations from H-3**
    - Go to "Text Translations" tab
    - Click "Batch Translate"
    - New translations created (based on H-3)
    - Old translations remain (archived)
    - New translations have `is_archived = false`
    - Info icon shows "Based on H-3 (Current)"

---

## Key Points

1. **Source of Truth:** The version marked "Ready to Translate" (`final_version_id`) is used for all new translations
2. **Version Tracking:** Every edit creates a new version (H-1, H-2, H-3...)
3. **Archival:** Old translations are archived (not deleted) when source changes
4. **Latest = Most Accurate:** The most recent translation (by `created_at`) is considered current
5. **Speech Generation:** Only uses translations that have been "Promoted to Speech Translation"
6. **Segment Splitting:** Translations are split into 1-2 sentence chunks for easier editing
7. **Audit Trail:** All versions are preserved with full edit history

---

## Summary

This workflow ensures:
- Complete version history
- Clear source tracking
- Easy editing with sentence-level granularity
- Automatic archival of outdated translations
- Full audit trail for quality control
- Seamless speech generation workflow

