# RAG Indexing Workflow

## Overview

This document explains the workflow for indexing transcripts into the RAG system for semantic search.

---

## Quick Summary

**RAG indexes the latest H-version (Final Version)** of transcripts, but requires a two-step process:
1. **Send to Insight** - Creates metadata extraction
2. **Index for RAG** - Generates chunks and embeddings

**Indexing only happens once per transcript** - prevents duplicate chunks.

---

## Complete Workflow

### Step 1: Edit & Finalize Transcript

1. User uploads audio file
2. System transcribes (T-1 - original Whisper)
3. User edits in "Edits" tab (creates H-1, H-2, etc.)
4. User clicks **"Promote to Final"** on desired version
5. Selected version becomes the Final Version

### Step 2: Send to Insight

1. Navigate to **"Final Version"** tab
2. Click **"🚀 Send to Insight"** button
3. System:
   - Creates `insight_transcripts` record (clone of Final Version)
   - Triggers Claude for metadata extraction
   - Stores metadata in `insight_metadata`
   - Updates pipeline status
4. Button changes to **"✓ Sent to Insight"**

### Step 3: Index for RAG

1. **"🤖 Index for RAG"** button appears (only after Step 2)
2. Click button
3. System:
   - Checks if chunks already exist (prevents duplicates)
   - Calls `/api/insight/chunk` endpoint
   - Splits transcript into semantic chunks
   - Generates OpenAI embeddings for each chunk
   - Stores chunks in `insight_chunks` with embeddings
   - Updates `insight_transcripts` with indexing metadata
4. Shows success message: **"✅ Transcript indexed for RAG with X chunks"**

### Step 4: Search via RAG

1. Navigate to **RAG Search** dashboard card
2. Enter natural language query
3. System performs semantic search
4. Select relevant chunks
5. Click **"Ask Claude"** for synthesized answer

---

## Data Flow

```
max_transcriptions
  ├─ final_version_id → Determines which version is final
  │
  ↓ (User clicks "Promote to Final")
  │
max_transcription_versions (H-1, H-2, etc.)
  │
  ↓ (User clicks "Send to Insight")
  │
insight_transcripts
  ├─ source_final_version_id → Links back to H-version
  ├─ text → Final version complete text
  ├─ json_with_timestamps → Timestamped segments
  │
  ↓ (User clicks "Index for RAG")
  │
insight_chunks
  ├─ chunk_number → Sequential ordering
  ├─ text → Chunk content
  ├─ embedding → OpenAI vector (1536-dim)
  ├─ timestamp_start/end → Time boundaries
  ├─ segment_markers → All segment timestamps within chunk
  ├─ final_version_reference_id → Links to source H-version
  │
  ↓ (User searches via RAG)
  │
search_insight_chunks() → Semantic similarity
  │
  ↓
claude_synthesis → Combined answer
```

---

## API Endpoints

### `/api/insight/send-to-brain` (POST)

**Purpose:** Create insight transcript and extract metadata

**Input:**
```json
{
  "transcriptionId": "uuid"
}
```

**Process:**
1. Gets final version from `max_transcriptions.final_version_id`
2. If `null` → uses T-1 (raw Whisper)
3. If UUID → uses H-version
4. Clones to `insight_transcripts`
5. Calls Claude for metadata extraction
6. Returns success/error

**Prevents Duplicates:** Blocks if `insight_transcripts` already exists for this `transcription_id`

---

### `/api/rag/send-to-rag` (POST)

**Purpose:** Index transcript for RAG by generating chunks and embeddings

**Input:**
```json
{
  "transcriptionId": "uuid"
}
```

**Process:**
1. Checks if `insight_transcripts` exists (requires Step 2 first)
2. Checks if chunks already exist (prevents duplicate indexing)
3. Calls `/api/insight/chunk` to generate chunks and embeddings
4. Returns success with chunk count

**Prevents Duplicates:** Blocks if `insight_chunks` already exist

---

### `/api/insight/chunk` (POST)

**Purpose:** Generate chunks with semantic boundaries and embeddings

**Input:**
```json
{
  "transcriptionId": "uuid"
}
```

**Process:**
1. Loads `insight_transcripts` data
2. Loads metadata for semantic boundaries
3. Splits into chunks (target: 500-800 tokens)
4. Generates OpenAI embeddings (text-embedding-3-small)
5. Stores chunks in `insight_chunks`
6. Updates `insight_transcripts.indexed_*` fields

**Output:**
```json
{
  "success": true,
  "message": "Chunking complete...",
  "data": {
    "chunkCount": 4,
    "chunks": [...]
  }
}
```

---

### `/api/insight/rag-search` (POST)

**Purpose:** Semantic search across indexed chunks

**Input:**
```json
{
  "query": "What are the steps for direct bonding?",
  "limit": 10,
  "distance_threshold": 0.5
}
```

**Process:**
1. Generates query embedding
2. Calls `search_insight_chunks()` function
3. Returns top-N results with similarity scores

---

### `/api/insight/rag-synthesize` (POST)

**Purpose:** Generate AI answer from selected chunks

**Input:**
```json
{
  "query": "What are the steps for direct bonding?",
  "chunk_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Process:**
1. Fetches chunk text and timestamps
2. Formats context for Claude
3. Calls Claude Sonnet 4 for synthesis
4. Returns answer with source citations

---

## UI Components

### Final Version Tab

**Location:** `/projects/[id]` → Click audio file → "Final Version" tab

**Buttons:**
- **"Send for Analysis"** (blue) → Calls `/api/transcriptions/[id]/analyze`
- **"🚀 Send to Insight"** (purple) → Calls `/api/insight/send-to-brain`
- **"🤖 Index for RAG"** (purple-pink gradient) → Calls `/api/rag/send-to-rag`
  - Only appears after "Send to Insight" succeeds
  - Shows loading spinner during processing

---

## Duplicate Prevention

### Insight Transcript Level
- **Check:** `SELECT * FROM insight_transcripts WHERE transcription_id = ?`
- **Action:** If exists, block creation
- **Message:** "This transcript has already been sent to Insight"

### RAG Indexing Level
- **Check:** `SELECT * FROM insight_chunks WHERE insight_transcript_id = ? LIMIT 1`
- **Action:** If exists, block indexing
- **Message:** "This transcript has already been indexed for RAG"

---

## Tracking Fields

### `insight_transcripts`
- `source_final_version_id` → Which H-version was cloned
- `source_is_t1` → Boolean if T-1 was used
- `indexed_final_version_id` → Confirms which version was indexed
- `indexed_at` → Timestamp of indexing
- `indexed_by` → User who triggered indexing

### `insight_chunks`
- `final_version_reference_id` → Links to source H-version
- `segment_markers` → All segment timestamps within chunk

---

## Re-indexing

### Current Behavior
If user wants to re-index after editing:
1. Manual: Delete old chunks from `insight_chunks`
2. Manual: Delete `insight_transcripts` record
3. Re-run Step 2 and Step 3

### Future Enhancement
- Auto-detect when Final Version changes
- Provide one-click re-index button
- Background job to keep RAG in sync

---

## Error Handling

### No Final Version
- **Error:** "No final version set. Please finalize a transcription version first."
- **Solution:** User must promote a version to Final

### Not Sent to Insight First
- **Error:** "Transcript must be sent to Insight first. Please use 'Send to Insight' button."
- **Solution:** User must complete Step 2 first

### Already Indexed
- **Error:** "This transcript has already been indexed for RAG"
- **Solution:** No action needed - already searchable

### Chunking Failed
- **Error:** "Indexing failed: [reason]"
- **Solution:** Check OpenAI API key, network connectivity

---

## Best Practices

### ✅ Recommended Workflow

1. **Edit thoroughly** (multiple H-versions)
2. **Promote best version** to Final
3. **Send to Insight** (extract metadata)
4. **Index for RAG** (enable search)
5. **Use RAG Search** (query knowledge base)

### ⚠️ Don't

- Index raw T-1 transcripts (has Whisper errors)
- Skip "Send to Insight" (missing metadata)
- Index before finalizing (wasted embeddings)

---

## Summary

**RAG indexing workflow:**
1. Finalize transcript (H-version)
2. Send to Insight (creates metadata)
3. Index for RAG (generates chunks + embeddings)
4. Search via RAG (semantic queries)

**Prevents duplicates at every step.**

**Tracks complete audit trail of which version was indexed.**

---

## Code References

- **UI:** `src/components/audio/TranscriptionView.tsx` (lines 466-486, 1332-1350)
- **RAG Send API:** `src/app/api/rag/send-to-rag/route.ts`
- **Chunk API:** `src/app/api/insight/chunk/route.ts`
- **Send to Insight API:** `src/app/api/insight/send-to-brain/route.ts`
- **Search API:** `src/app/api/insight/rag-search/route.ts`
- **Synthesize API:** `src/app/api/insight/rag-synthesize/route.ts`

