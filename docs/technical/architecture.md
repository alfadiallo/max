# Max Architecture & Workflow

System design, data flows, and end-to-end processes for the Max platform.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  React Components + TypeScript + Tailwind CSS                   │
│  ├── Auth pages (register, login)                               │
│  ├── Dashboard (projects, transcriptions)                       │
│  ├── Editors (transcription, translation)                       │
│  ├── Generators (summaries, prompts)                            │
│  └── Settings (dictionary, prompts)                             │
└───────────────────┬─────────────────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────────────────────┐
│                   Backend (Next.js API Routes)                  │
│  ├── /api/auth/* (register, login, logout)                      │
│  ├── /api/projects/* (CRUD)                                     │
│  ├── /api/audio/* (upload, list)                                │
│  ├── /api/transcriptions/* (transcribe, edit, version)          │
│  ├── /api/translations/* (create, edit, version)                │
│  ├── /api/dictionary/* (add, apply, search)                     │
│  ├── /api/summaries/* (generate, edit, finalize)                │
│  ├── /api/prompts/* (get, update, version)                      │
│  └── /api/feedback/* (analytics)                                │
└───────┬─────────────────┬─────────────────────┬──────────┬──────┘
        │                 │                     │          │
        │ Supabase SDK    │ OpenAI HTTP         │ Claude   │ ElevenLabs
        │                 │                     │          │
┌───────▼──────┐ ┌────────▼──────┐ ┌───────────▼───┐ ┌───▼──────┐
│  Supabase    │ │  OpenAI API   │ │ Anthropic API │ │ ElevenLabs
│  PostgreSQL  │ │  (Whisper)    │ │   (Claude)    │ │ (Voice)
│  Storage     │ │               │ │               │ │
└──────────────┘ └───────────────┘ └───────────────┘ └──────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Hosting** | Vercel | Global CDN, serverless functions |
| **Frontend** | Next.js 13+ | React framework with file routing |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Database** | Supabase (PostgreSQL) | Relational DB with real-time |
| **Storage** | Supabase Storage (S3) | Audio files, transcripts |
| **Auth** | Supabase Auth | User authentication |
| **Transcription** | OpenAI Whisper | Speech-to-text |
| **Translation** | Anthropic Claude | Text translation |
| **Content Gen** | Anthropic Claude | Email/LinkedIn/blog summaries |
| **Voice Synthesis** | ElevenLabs | (Future) Voice cloning |
| **Domain** | GoDaddy | DNS only; Vercel handles HTTPS |

---

## Data Flow Diagrams

### 1. Audio Upload & Transcription Flow

```
┌──────────────┐
│ User selects │
│ audio file   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Frontend: AudioUploadModal                          │
│ - Select project type (Lecture, Webinar, etc.)     │
│ - Add metadata (location, date, misc)              │
│ - Drag-drop or file picker                         │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ POST /api/audio/upload
┌─────────────────────────────────────────────────────┐
│ Backend: Audio Upload Handler                      │
│ - Validate file (size, format)                     │
│ - Store file path                                  │
│ - Generate upload URL (Supabase)                   │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ PUT https://[bucket].supabase.co/storage/v1/...
┌─────────────────────────────────────────────────────┐
│ Supabase Storage                                    │
│ Path: audio/[project-type]/[uuid]-[filename]       │
│ File saved ✓                                        │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ Create audio_files DB record
┌─────────────────────────────────────────────────────┐
│ Supabase Database                                   │
│ INSERT INTO audio_files (...)                       │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ Response to frontend
┌──────────────────────────────┐
│ Frontend: Show file details  │
│ - Audio player              │
│ - "Transcribe" button       │
└──────┬─────────────────────────┘
       │ User clicks "Transcribe"
       │
       ▼ POST /api/transcribe
┌─────────────────────────────────────────────────────┐
│ Backend: Transcribe Handler                        │
│ - Fetch audio file from storage                    │
│ - Read file into memory                            │
│ - Call OpenAI Whisper API                          │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ POST https://api.openai.com/v1/audio/transcriptions
┌─────────────────────────────────────────────────────┐
│ OpenAI Whisper API                                  │
│ - Process audio file                               │
│ - Extract speech segments with timestamps          │
│ - Return JSON with timestamps                      │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ Parse & store transcription
┌─────────────────────────────────────────────────────┐
│ Backend: Parse Whisper Response                    │
│ - Convert to standardized format:                  │
│   [{start: 0, end: 5.2, text: "...", speaker: "Dr. Soto"}]
│ - Store raw_text and json_with_timestamps          │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ INSERT INTO transcriptions
┌─────────────────────────────────────────────────────┐
│ Supabase Database                                   │
│ Transcription created (T-1)                        │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ Return to frontend
┌──────────────────────────────┐
│ Frontend: Display transcription
│ - Show timeline with timestamps
│ - Allow inline editing
│ - Auto-save every 5 min
└──────────────────────────────┘
```

### 2. Transcription Editing & Versioning

```
┌─────────────────────────────────────────────────────┐
│ Frontend: Transcription Editor                     │
│ - Display T-1 (original)                           │
│ - User makes edits                                 │
│ - Auto-save every 5 minutes (draft, not versioned) │
│ - Show last saved time                             │
└──────┬────────────────────────────────────────────────┘
       │ Every 5 minutes
       ▼ POST /api/transcriptions/[id]/auto-save
┌─────────────────────────────────────────────────────┐
│ Backend: Auto-Save Handler                         │
│ - Save draft to cache/memory (not DB)              │
│ - Return save confirmation                         │
└──────┬────────────────────────────────────────────────┘
       │ User clicks "Save & Close"
       │
       ▼ POST /api/transcriptions/[id]/save-version
┌─────────────────────────────────────────────────────┐
│ Backend: Save Version Handler                      │
│ - Calculate diff (compare to previous version)     │
│ - Generate diff JSON (operations: replace, insert) │
│ - Create new transcription_versions record         │
│ - version_number: 1                                │
│ - version_type: 'H-1'                              │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ INSERT INTO transcription_versions
┌─────────────────────────────────────────────────────┐
│ Supabase Database                                   │
│ Version H-1 saved with:                            │
│ - edited_text (full corrected text)               │
│ - json_with_timestamps                            │
│ - diff_from_previous                              │
│ - edited_by (user_id)                             │
└──────┬────────────────────────────────────────────────┘
       │
       ▼ Return to frontend
┌──────────────────────────────────┐
│ Frontend: Show confirmation      │
│ - "Saved as H-1"               │
│ - Show version history          │
│ - Enable next steps (translate) │
└──────────────────────────────────┘
```

### 3. Translation & Dictionary Workflow

```
┌────────────────────────────────────┐
│ User at transcription detail page  │
│ Clicks "Translate to Spanish"      │
└──────┬─────────────────────────────┘
       │
       ▼ POST /api/translations/create
┌────────────────────────────────────────────┐
│ Backend: Create Translation Handler        │
│ 1. Fetch latest H-X or T-1 text           │
│ 2. Fetch translation prompt template       │
│ 3. Prepare Claude request                 │
└──────┬─────────────────────────────────────┘
       │
       ▼ POST https://api.anthropic.com/v1/messages
┌────────────────────────────────────────────┐
│ Anthropic Claude API                       │
│ Request: Translate text to Spanish         │
│ Response: Spanish translation + timestamps │
└──────┬─────────────────────────────────────┘
       │
       ▼ Backend: Apply Dictionary
┌────────────────────────────────────────────────────┐
│ Backend: Dictionary Correction                    │
│ 1. Fetch dictionary entries for Spanish (es)     │
│ 2. For each correction:                           │
│    - Replace term_original → term_corrected      │
│    - Track replacement location                   │
│ 3. Store all replacements in JSON:               │
│    [{term_original, term_corrected, position}]   │
│ 4. Increment usage_count for each term            │
└──────┬─────────────────────────────────────────────┘
       │
       ▼ INSERT INTO translations
┌────────────────────────────────────────────┐
│ Supabase Database                          │
│ Translation created with:                  │
│ - transcription_id                        │
│ - language_code: 'es'                     │
│ - translated_text (with corrections)      │
│ - dictionary_corrections_applied (JSON)   │
└──────┬─────────────────────────────────────┘
       │
       ▼ Return to frontend
┌────────────────────────────────────────────┐
│ Frontend: Show Spanish translation         │
│ - Show timeline with Spanish text         │
│ - Allow editing (create H-2-es)          │
│ - Show applied dictionary corrections     │
│ - Button: "Ready for ElevenLabs"         │
└────────────────────────────────────────────┘
```

### 4. Generated Summaries & Feedback Loop

```
┌──────────────────────────────────┐
│ User at transcription detail     │
│ Clicks "Generate Summaries"      │
└──────┬───────────────────────────┘
       │
       ▼ POST /api/summaries/generate
┌──────────────────────────────────────────┐
│ Backend: Generate Summaries Handler      │
│ For each type (email, linkedin, blog):   │
│   1. Fetch latest H-X or T-1 text       │
│   2. Fetch current prompt template       │
│   3. Call Claude API with (text + prompt)
└──────┬───────────────────────────────────┘
       │
       ▼ 3x Claude API calls in parallel
┌──────────────────────────────────────────┐
│ Anthropic Claude API                     │
│ - Email summary (2-3 sentences)         │
│ - LinkedIn summary (150 chars)          │
│ - Blog summary (300-500 words)          │
└──────┬───────────────────────────────────┘
       │
       ▼ INSERT INTO generated_summaries
┌──────────────────────────────────────────────────┐
│ Supabase Database                               │
│ For each summary_type:                          │
│ - generated_text (from Claude)                  │
│ - user_edited_text: NULL                        │
│ - edited_by: NULL                               │
│ - generated_at: NOW()                           │
│ - finalized_at: NULL                            │
└──────┬───────────────────────────────────────────┘
       │
       ▼ Return to frontend
┌─────────────────────────────────────────────┐
│ Frontend: Show 3 Summaries                  │
│ Each summary card:                          │
│ - Generated text (read-only)               │
│ - Edit button                              │
│ - Finalize button                          │
└──────┬──────────────────────────────────────┘
       │ User edits email summary
       │
       ▼ PUT /api/summaries/[summaryId]
┌─────────────────────────────────────────────┐
│ Backend: Update Summary                     │
│ - Store user_edited_text                   │
│ - edited_by: current user_id                │
│ - edited_at: NOW()                         │
└──────┬──────────────────────────────────────┘
       │
       ▼ UPDATE generated_summaries
┌─────────────────────────────────────────────┐
│ Supabase Database                           │
└──────┬──────────────────────────────────────┘
       │ User clicks "Finalize"
       │
       ▼ POST /api/summaries/[summaryId]/finalize
┌──────────────────────────────────────────────────┐
│ Backend: Finalize Handler                      │
│ 1. Set finalized_at = NOW()                    │
│ 2. Calculate diff:                             │
│    - generated_text vs user_edited_text       │
│    - length change %                          │
│    - tone/structure changes                   │
│ 3. Create feedback_log entry                  │
└──────┬───────────────────────────────────────────┘
       │
       ▼ INSERT INTO feedback_log
┌──────────────────────────────────────────────────┐
│ Supabase Database                               │
│ Feedback entry created with diff analysis       │
│ (used for prompt refinement later)              │
└──────┬───────────────────────────────────────────┘
       │
       ▼ Return to frontend
┌──────────────────────────────────┐
│ Frontend: Confirmation           │
│ "Summary finalized and logged"   │
│ Can now:                         │
│ - Copy to clipboard              │
│ - Download as file               │
└──────────────────────────────────┘
```

---

## Database Relationships

```
users
  ├── created projects (1:many)
  ├── uploaded audio_files (1:many)
  └── made all edits (1:many)

projects (group audio files by type)
  ├── project_type (1:1)
  └── audio_files (1:many)

audio_files (raw uploads)
  └── transcriptions (1:1, each audio has one T-1)

transcriptions (T-1, initial Whisper output)
  ├── transcription_versions (1:many, H-1, H-2, etc.)
  ├── translations (1:many, one per language)
  │   └── translation_versions (1:many, H-2-es, H-2-pt, etc.)
  └── generated_summaries (1:many, email/linkedin/blog)
      └── feedback_log (1:many, tracks user edits)

dictionary (master term corrections)
  └── Applies to ALL translations (used during translation)

prompt_templates (email/linkedin/blog templates)
  └── prompt_versions (1:many, version history)
```

---

## User Workflows

### Workflow 1: Create English Transcript

**Goal:** Record → Transcribe → Edit → Save

**Steps:**
1. Register/Login
2. Create Project (select type + metadata)
3. Upload Audio File
4. Click "Transcribe" (calls Whisper)
5. Review T-1 (auto-generated)
6. Edit text in editor
7. Every 5 min: Auto-save draft
8. Click "Save & Close" → Create H-1 version
9. ✅ Done!

**Time:** ~10 minutes

---

### Workflow 2: Translate to Multiple Languages

**Goal:** English transcript → Spanish, French, Portuguese translations

**Steps:**
1. Go to transcription detail
2. Click "Create Translation" → Select "Spanish"
3. System calls Claude → Create Spanish translation
4. System applies dictionary corrections
5. User reviews translation
6. User edits as needed → Save as H-2-es
7. Click "Ready for ElevenLabs"
8. Repeat for other languages (French, Portuguese, etc.)
9. ✅ All translations ready!

**Time:** ~5 minutes per language

---

### Workflow 3: Generate & Refine Summaries

**Goal:** English transcript → 3 summaries (email, LinkedIn, blog)

**Steps:**
1. Go to transcription detail
2. Click "Generate Summaries"
3. System calls Claude 3x (parallel)
4. Review 3 summaries
5. Edit email summary:
   - Click "Edit"
   - Make changes
   - Click "Finalize" → Logged in feedback_log
6. Edit LinkedIn summary (optional)
7. Edit blog summary (optional)
8. ✅ Summaries ready to distribute!

**Time:** ~10 minutes

---

### Workflow 4: Refine Prompt Templates

**Goal:** Improve summary generation over time

**Steps:**
1. Go to Settings > Prompt Templates
2. Click "Email Summary"
3. Review current template (version N)
4. See version history:
   - What changed?
   - Who changed it?
   - When?
5. Click "Edit"
6. Modify template text
7. Add "Change Notes" (e.g., "Made more casual")
8. Click "Save"
9. System creates new version (version N+1)
10. Next summaries use updated template
11. ✅ Improvements applied!

**Time:** ~5 minutes

---

### Workflow 5: Improve Dictionary Over Time

**Goal:** Build dental terminology dictionary

**Steps:**
1. During transcription editing:
   - User finds mistake (e.g., "veneers" → "veneers")
   - Clicks "Add to Dictionary"
   - Confirms correction
2. System creates dictionary entry:
   - term_original: "veneers"
   - term_corrected: "veneers"
   - language_code: "en"
3. Future translations automatically apply this correction
4. View all terms: Settings > Dictionary
5. Export/import dictionary as needed
6. ✅ Team learns from corrections!

**Time:** ~1 minute per term

---

## Scaling Considerations

### Current (5 users, internal)

```
Users:           5
Projects/month:  ~20
Audios/month:    ~100
Transcriptions:  ~150
Translations:    ~1200 (8 languages × 150)
Summaries:       ~450 (3 summaries × 150)

Storage:
  Audio: ~50GB (500MB average × 100)
  Transcripts: ~5GB (text only)
  Total: ~55GB
```

### Database Optimization (if needed)

```sql
-- Add indexes for common queries
CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);
CREATE INDEX idx_translations_language ON translations(language_code);
CREATE INDEX idx_feedback_created_at ON feedback_log(created_at DESC);

-- Partition large tables by date (if > 1M rows)
CREATE TABLE transcriptions_2025_q1 PARTITION OF transcriptions
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
```

### Future Scaling (if expanded)

**Team grows beyond 5:**
- Add role-based access control (admin, editor, viewer)
- Add project team assignments
- Add approval workflows

**More projects:**
- Add ElasticSearch for full-text search
- Cache recent translations (Redis)
- Queue transcription jobs (Bull queue)

**More languages:**
- Implement language packs
- Add more voice models to ElevenLabs

---

## Security Architecture

### Authentication

```
User registers/logs in
  ↓
Supabase Auth (managed by Supabase)
  ↓
JWT token issued (valid 1 hour)
  ↓
Refresh token stored (valid 7 days)
  ↓
Frontend stores JWT in session/cookie
  ↓
All API requests include Authorization: Bearer [JWT]
  ↓
Backend verifies JWT before processing
```

### Data Protection

- **In transit:** HTTPS only
- **At rest:** Supabase encryption (PostgreSQL + S3)
- **Database:** Row-level security (RLS) policies
- **Storage:** Bucket policies (public read, authenticated write)
- **Secrets:** API keys in `.env` (never committed)

### Audit Trail

Every edit is tracked:
- Who changed it (user_id)
- When they changed it (created_at)
- What they changed (diff_from_previous)
- Version number (for rollback)

---

## Error Handling

### Strategy

```
API Request
  ↓
Validation (400 if invalid)
  ↓
Authentication (401 if not logged in)
  ↓
Authorization (403 if no permission)
  ↓
Processing
  │
  ├─ Success → Return 200 with data
  │
  └─ Error:
      ├─ 404 Not Found
      ├─ 409 Conflict
      ├─ 500 Server Error
      └─ 504 Timeout (Whisper/Claude too slow)
```

### User-Facing Error Messages

```
Frontend catches error
  ↓
Display to user:
  - "Transcription timed out. Try with a shorter file."
  - "Translation failed. Check your internet connection."
  - "Storage bucket not configured. Contact support."
  ↓
Log error to Sentry (optional)
```

---

## Performance Targets

| Operation | Target Time | Notes |
|-----------|------------|-------|
| Register | <2s | Auth provider response |
| Login | <1s | JWT generation |
| Create project | <1s | DB insert |
| Upload audio | <5s | File upload (5-100MB) |
| Start transcription | <1min | OpenAI API latency |
| Create translation | <30s | Claude API + dictionary |
| Generate 3 summaries | <20s | 3 Claude calls in parallel |
| Save version | <1s | DB diff + insert |
| Auto-save | <500ms | Async, no UI blocking |

---

## Deployment Pipeline

```
Developer:
  git commit → git push origin main
    ↓
GitHub:
  Runs tests + linting
    ↓
Vercel:
  Automatic deployment triggered
  ├── npm install
  ├── npm run build
  ├── npm run type-check
  ├── Deploy to CDN
  └── Domain propagated (usemax.io)
    ↓
Users:
  Access new version instantly via https://usemax.io
```

---

## Monitoring & Diagnostics

### Health Checks

```
GET /api/health
  ├── Database connected ✅
  ├── Storage buckets available ✅
  ├── API keys valid ✅
  └── Timestamp: 2025-10-25T15:30:00Z
```

### Logs to Monitor

**Frontend (browser console):**
```
[React] Component mounted
[API] POST /api/transcribe → 200
[ERROR] Failed to parse timestamp
```

**Backend (server terminal):**
```
[AUTH] User registered: user@example.com
[UPLOAD] File saved: audio/lecture/uuid.mp3
[TRANSCRIBE] Starting Whisper...
[TRANSLATE] Claude response: 2847 tokens
[ERROR] Dictionary correction failed
```

**Database (Supabase logs):**
```
Query time: 234ms
Slow query: SELECT from translations (needs index)
Connection: 45 active connections
```

---

## Summary

Max platform orchestrates:

1. **Upload** → Audio stored in Supabase Storage
2. **Transcribe** → Whisper API converts to text with timestamps
3. **Edit** → Human refines English transcript (H-1, H-2, etc.)
4. **Translate** → Claude translates + dictionary applies corrections
5. **Summarize** → Claude creates email/LinkedIn/blog summaries
6. **Refine** → User edits summaries + feedback logged
7. **Improve** → Prompts & dictionary evolve from feedback

All data tracked with full version history, audit trail, and rollback capability.

Designed for 5-person team. Scales to enterprise with partitioning & caching.