# Comprehensive Data Storage Report - Max Transcription System

**Last Updated:** January 29, 2025  
**Session:** 7 - After Transcription Editor Refactor

---

## 📊 Table of Contents

1. [English Transcription Data](#english-transcription)
2. [Translation/Dubbing Data](#translation-dubbing)
3. [Edit Tracking System](#edit-tracking)
4. [Generated Speech](#generated-speech)
5. [Insight System Data](#insight-system)
6. [Data Flow Diagram](#data-flow)

---

## English Transcription Data {#english-transcription}

### 1. **Original Whisper Transcription (T-1)**

**Table:** `max_transcriptions`  
**Recorded:** Once per audio file (when transcription is generated)

**Key Columns:**
- `id` (UUID) - Primary key
- `audio_file_id` (UUID) - Links to audio file
- `transcription_type` (TEXT) - Default: 'T-1'
- `raw_text` (TEXT) - **Complete English text from Whisper**
- `json_with_timestamps` (JSONB) - **Timestamped segments with start/end times**
- `created_by` (UUID) - User who initiated transcription
- `created_at` (TIMESTAMP) - When transcription was generated
- `final_version_id` (UUID) - **Which version is marked as "Final"**

**Purpose:** The base transcription that never changes. All edits create new versions.

---

### 2. **Human-Edited Versions (H-1, H-2, H-3, etc.)**

**Table:** `max_transcription_versions`  
**Recorded:** Every time user clicks "Save Version" in the editor

**Key Columns:**
- `id` (UUID) - Primary key
- `transcription_id` (UUID) - Links to parent transcription
- `version_number` (INTEGER) - Sequential: 1, 2, 3, etc.
- `version_type` (TEXT) - **'H-1', 'H-2', 'H-3', etc.**
- `edited_text` (TEXT) - **Complete edited text (generated from segments)**
- `json_with_timestamps` (JSONB) - **Timestamped segments with user edits**
- `dictionary_corrections_applied` (JSONB) - **Array of actual edits made**
- `edited_by` (UUID) - User who made the edits
- `created_at` (TIMESTAMP) - When version was saved

**NEW (Session 7):**
- `dictionary_corrections_applied` - Stores only the segments user actually edited
- Format: Array of objects with `original_text`, `corrected_text`, timestamps, context
- This replaces the broken diff algorithm

**Purpose:** Stores each iteration of edits. User can have H-1, H-2, H-3, etc.

---

### 3. **Final Version Reference**

**Column:** `max_transcriptions.final_version_id`

**How It Works:**
- `NULL` = T-1 is the final version (original Whisper)
- UUID = Points to a specific H-version that is "Final"
- Example: `final_version_id = 'abc-123'` means H-3 is the final version

**Purpose:** Tracks which version is officially "done" and ready for translation/insight

**Display Syntax:** FV-[H version]-[file identifier]

---

## Translation/Dubbing Data {#translation-dubbing}

### 1. **Translation Records**

**Table:** `max_translations`  
**Recorded:** Once per language when translation is generated

**Key Columns:**
- `id` (UUID) - Primary key
- `transcription_id` (UUID) - Links to English transcription
- `language_code` (TEXT) - Target language (e.g., 'sp', 'fr', 'ar')
- `translated_text` (TEXT) - Full translated text
- `json_with_timestamps` (JSONB) - Timestamped translated segments
- `dictionary_corrections_applied` (JSONB) - Edits made to translation
- `created_at` (TIMESTAMP) - When translation was generated
- `updated_at` (TIMESTAMP) - Last modification
- `final_version_id` (UUID) - **Which translation version is "Final"**

**Purpose:** Base record for each language translation.

---

### 2. **Translation Versions**

**Table:** `max_translation_versions`  
**Recorded:** Every time user edits a translation

**Key Columns:**
- `id` (UUID) - Primary key
- `translation_id` (UUID) - Links to parent translation
- `version_number` (INTEGER) - Sequential versions
- `version_type` (TEXT) - 'H-1', 'H-2', etc.
- `edited_text` (TEXT) - Full edited translation text
- `json_with_timestamps` (JSONB) - Timestamped segments with edits
- `diff_from_previous` (TEXT) - Diff from previous version (deprecated)
- `edited_by` (UUID) - User who edited
- `created_at` (TIMESTAMP) - When saved

**Purpose:** Stores edited versions of translations.

---

## Edit Tracking System {#edit-tracking}

**NEW in Session 7:** UI-based tracking (replaced broken diff algorithm)


### 1. **Edit Tracking in Versions**

**Column:** `max_transcription_versions.dictionary_corrections_applied` (JSONB)

**Format:**
```json
[
  {
    "original_text": "Invisalign Smile Architect",
    "corrected_text": "Invisalign® Smile Architect",
    "position_start": 45.2,
    "position_end": 48.5,
    "context_before": "",
    "context_after": ""
  }
]
```

**What's Tracked:**
- Only segments the user actually changed in the UI
- Original text → corrected text
- Timestamps from the segment
- No false positives (broken diff algorithm removed)

**Purpose:** Records what was actually edited for future automation.

---

### 2. **Correction Patterns (Learning)**

**Table:** `max_transcription_correction_patterns`  
**Recorded:** When patterns emerge from multiple edits

**Key Columns:**
- `id` (UUID) - Primary key
- `original_text` (TEXT) - Original incorrect text
- `corrected_text` (TEXT) - User's correction
- `context_before` (TEXT) - Words before correction
- `context_after` (TEXT) - Words after correction
- `confidence_score` (INTEGER) - How often this correction was used
- `language_code` (TEXT) - Language context
- `created_by` (UUID) - User who made first correction
- `first_seen_at` (TIMESTAMP) - When first detected
- `last_seen_at` (TIMESTAMP) - Most recent occurrence
- `times_used` (INTEGER) - Count of times correction was applied

**Purpose:** Learn common mistakes and automate future corrections.

**Status:** Schema created, not yet implemented

---

### 3. **Corrections Dashboard Data**

**Source:** Aggregated from `max_transcription_versions.dictionary_corrections_applied`

**Features:**
- View all edits across all transcriptions
- Group by audio file or global dictionary
- Filter by file, project, or user
- Show context around each edit

**Status:** UI built, data sourced from version corrections

---

## Generated Speech {#generated-speech}

### **Speech Files**

**Table:** `max_generated_speech`  
**Recorded:** When user generates speech from a translation

**Key Columns:**
- `id` (UUID) - Primary key
- `transcription_id` (UUID) - Links to English transcription
- `translation_id` (UUID) - Links to translation record
- `translation_version_id` (UUID) - Links to specific version used
- `language_code` (TEXT) - Target language
- `voice_id` (TEXT) - ElevenLabs voice ID
- `voice_name` (TEXT) - Human-readable name
- `voice_type` (TEXT) - 'generic', 'instant_clone', 'professional_clone'
- `audio_url` (TEXT) - **URL to generated audio file in storage**
- `speech_source` (TEXT) - 'original_text' or 'edited_text'
- `generation_settings` (JSONB) - Voice parameters
- `status` (TEXT) - 'processing', 'completed', 'failed'
- `created_by` (UUID) - User who initiated generation
- `created_at` (TIMESTAMP) - When generation started
- `completed_at` (TIMESTAMP) - When generation finished

**Purpose:** Tracks all generated speech audio files.

**Storage:** Audio files stored in Supabase Storage, URL in database.

---

## Insight System Data {#insight-system}

### 1. **Insight Transcripts**

**Table:** `insight_transcripts`  
**Recorded:** When user sends transcription to Insight

**Key Columns:**
- `id` (UUID) - Primary key
- `transcription_id` (UUID) - Links to English transcription
- `source_final_version_id` (UUID) - Final version used
- `created_at` (TIMESTAMP) - When sent to Insight

**Purpose:** Tracks which transcriptions have been processed by Insight.

---

### 2. **Metadata**

**Table:** `insight_metadata`  
**Recorded:** After Claude analysis

**Key Columns:**
- `transcript_id` (UUID) - Links to insight_transcripts
- `content_type` (TEXT) - Tutorial, Presentation, Interview, etc.
- `thematic_tags` (JSONB) - Array of themes
- `key_concepts` (JSONB) - Array of concepts
- `target_audience` (TEXT) - Primary audience
- `tone` (TEXT) - Professional, Casual, etc.
- `duration_category` (TEXT) - Short, Medium, Long
- `language_style` (TEXT) - Technical, Moderate, Simple
- `summary` (TEXT) - 2-3 sentence summary
- `review_status` (TEXT) - 'pending', 'approved', 'rejected', 'edited'

**Purpose:** Extracted insights from transcript content.

---

### 3. **Tags**

**Table:** `insight_tags`  
**Stores:** Tag values and their usage

**Purpose:** Controlled vocabulary for content classification.

---

### 4. **Pipeline Status**

**Table:** `insight_pipeline_status`  
**Tracks:** Processing stages (metadata extraction, chunking, content generation)

---

### 5. **Chunks**

**Table:** `insight_chunks`  
**Stores:** Searchable segments of transcription

**Key Columns:**
- `transcript_id` (UUID) - Links to insight_transcripts
- `chunk_index` (INTEGER) - Order in transcript
- `text` (TEXT) - Chunk text content
- `tokens` (INTEGER) - Token count
- `tags` (JSONB) - Related tags
- `timestamp_start_seconds` (INTEGER) - Start time
- `timestamp_end_seconds` (INTEGER) - End time

**Purpose:** Enable search across transcriptions.

---

### 6. **Content Outputs**

**Table:** `insight_content_outputs`  
**Stores:** Generated marketing content

**Key Columns:**
- `transcript_id` (UUID) - Links to insight_transcripts
- `content_type` (TEXT) - email, social_post, blog_outline, video_clip_specs
- `content` (JSONB) - Generated content
- `audience` (TEXT) - Target audience
- `status` (TEXT) - draft, approved, rejected, edited

**Purpose:** Store AI-generated marketing content for review.

---

## Data Flow Diagram {#data-flow}

```
AUDIO FILE (MP3)
    ↓
max_audio_files (file path in storage)
    ↓
max_transcriptions (T-1: raw_text + json_with_timestamps)
    ↓
max_transcription_versions (H-1, H-2, H-3...)
    ├─ edited_text (complete text)
    ├─ json_with_timestamps (segments with edits)
    └─ dictionary_corrections_applied (actual edits)
    ↓
final_version_id → Points to approved H-version
    ↓
    ├→ max_translations (per language)
    │   ├─ translated_text
    │   ├─ json_with_timestamps
    │   └─ max_translation_versions (H-1, H-2...)
    │       ↓
    │       max_generated_speech (audio files)
    │
    └→ insight_transcripts
        ├─ insight_metadata
        ├─ insight_chunks
        └─ insight_content_outputs
```

---

## Key Changes (Session 7)

### ✅ What Changed
1. **Edit Tracking Now Accurate:**
   - Old: Broken diff algorithm created 427 false corrections
   - New: Only records segments user explicitly changed in UI
   - Source: `editedSegmentIndices` from side-by-side editor

2. **Timestamped Format is Source of Truth:**
   - Left panel: Read-only T-1 segments
   - Right panel: Editable segments
   - `json_with_timestamps` drives everything
   - `edited_text` generated from segments on save

3. **Removed Broken Code:**
   - Deleted `src/lib/utils/diffGenerator.ts`
   - Removed unused `previousText` logic
   - Removed unused `showExport` state

### 🔄 What Stays the Same
- Database schema (no changes to tables)
- Final version tracking via `final_version_id`
- Translation workflow
- Speech generation workflow
- Insight system

---

## Summary by Use Case

### "Where is my original transcription?"
**Table:** `max_transcriptions.raw_text` + `json_with_timestamps`  
**Never changes** once Whisper creates it.

### "Where are my edits?"
**Table:** `max_transcription_versions`  
- Each H-version stores `edited_text` and `json_with_timestamps`
- `dictionary_corrections_applied` lists what changed

### "Which version is Final?"
**Column:** `max_transcriptions.final_version_id`  
- NULL = T-1 is final
- UUID = H-version is final

### "Where is the Complete Script?"
**Table:** `max_transcription_versions.edited_text`  
Generated from `json_with_timestamps` segments.

### "Where is the Timestamped Dubbing Script?"
**Table:** `max_transcription_versions.json_with_timestamps`  
Array of segments with start/end times and text.

### "Where are my translations?"
**Table:** `max_translations` → `max_translation_versions`  
Same structure as English, per language.

### "Where is the generated speech?"
**Table:** `max_generated_speech.audio_url`  
Points to file in Supabase Storage.

### "Where are my corrections tracked?"
**Column:** `max_transcription_versions.dictionary_corrections_applied`  
Only actual edits, no false positives.

---

## 🔍 Quick Lookup

| Data Type | Primary Table | Key Columns | When Recorded |
|-----------|---------------|-------------|---------------|
| Original Audio | `max_audio_files` | `file_path` | Upload |
| Original T-1 | `max_transcriptions` | `raw_text`, `json_with_timestamps` | Whisper transcription |
| H-Versions | `max_transcription_versions` | `edited_text`, `json_with_timestamps`, `dictionary_corrections_applied` | Every save |
| Final Version | `max_transcriptions.final_version_id` | Points to H-version | Promote to final |
| Translations | `max_translations` → `max_translation_versions` | `translated_text`, `json_with_timestamps` | Generate/edit |
| Speech Files | `max_generated_speech` | `audio_url`, `translation_version_id` | Generate |
| Corrections | `max_transcription_versions.dictionary_corrections_applied` | Array of edits | On save |
| Metadata | `insight_metadata` | Extracted insights | Claude analysis |
| Chunks | `insight_chunks` | Searchable segments | Chunking |
| Content | `insight_content_outputs` | Marketing content | Generation |

---

**Document Version:** 2.0 (Session 7)  
**Next Review:** After major schema changes

