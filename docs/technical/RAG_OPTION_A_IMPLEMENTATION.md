# RAG System Implementation - Option A

## Overview

This is the **safe, non-breaking** migration approach that extends your existing Insight system with RAG capabilities. It maintains your current architecture while adding necessary columns and functions.

---

## Key Differences from Proposed Migration

| Aspect | Proposed | Option A (This) |
|--------|----------|-----------------|
| **Target Table** | Extend `insight_chunks` directly | ✅ Extend `insight_chunks` (same) |
| **Embedding Dimension** | 384 (Sentence Transformers) | ✅ 1536 (OpenAI - your existing) |
| **Indexing Tracking** | On `max_transcriptions` | ✅ On `insight_transcripts` |
| **Pipeline Status** | New `rag_pipeline_status` table | ✅ Extend existing `insight_pipeline_status` |
| **Foreign Keys** | Direct to versions | ✅ Through `insight_transcripts` (your flow) |

---

## What Gets Added

### 1. **insight_chunks table** (new columns)

```sql
+ segment_markers JSONB              -- ["0:00", "0:06", "0:09"] for video links
+ final_version_reference_id UUID    -- Audit trail of source version
```

### 2. **insight_transcripts table** (new columns)

```sql
+ indexed_final_version_id UUID      -- Which H-version was indexed
+ indexed_at TIMESTAMP               -- When indexed
+ indexed_by UUID                    -- Who triggered it
```

### 3. **max_transcription_versions table** (new column)

```sql
+ is_final BOOLEAN                   -- Flag for final versions
```

### 4. **insight_pipeline_status table** (new columns)

```sql
+ rag_indexing_started_at TIMESTAMP
+ rag_indexing_completed_at TIMESTAMP
+ rag_status TEXT                    -- 'pending' | 'processing' | 'completed' | 'failed'
+ rag_total_chunks INT
+ rag_embedded_chunks INT
```

### 5. **New Functions**

- `search_insight_chunks()` - Vector similarity search with 1536-dim embeddings
- `update_insight_transcript_indexed_status()` - Auto-update trigger

---

## How to Apply

### Step 1: Review the Migration

```bash
# Review the migration file
cat sql/migrations/supabase-rag-extension-option-a.sql
```

### Step 2: Test on Staging

```bash
# Apply to staging database
psql -d your_staging_db -f sql/migrations/supabase-rag-extension-option-a.sql
```

### Step 3: Verify Changes

```sql
-- Run verification queries (uncomment in migration file)
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'insight_chunks' 
  AND column_name IN ('segment_markers', 'final_version_reference_id');

-- Check embedding dimension (should be 1536)
SELECT 
  (SELECT atttypmod 
   FROM pg_attribute 
   WHERE attrelid = 'insight_chunks'::regclass 
     AND attname = 'embedding' 
     AND atttypid = (SELECT oid FROM pg_type WHERE typname = 'vector')
  ) as vector_dimensions;
```

### Step 4: Apply to Production

```bash
# After testing, apply to production
psql -d your_production_db -f sql/migrations/supabase-rag-extension-option-a.sql
```

---

## Data Flow After Migration

```
User marks transcript as "Final"
        │
        ▼
max_transcription_versions.is_final = TRUE
        │
        ▼
POST /api/insight/chunk (your existing endpoint)
        │
        ▼
Clone to insight_transcripts (if not exists)
        │
        ▼
Process segments into chunks
        │
        ▼
Store in insight_chunks with:
  - text (existing)
  - embedding vector(1536) (existing)
  - segment_markers (NEW) ← ["0:00", "0:06", ...]
  - final_version_reference_id (NEW) ← Points to H-version
        │
        ▼
Update insight_transcripts:
  - indexed_final_version_id (NEW)
  - indexed_at (NEW) ← Auto-set by trigger
        │
        ▼
✅ Chunks are now searchable via RAG
```

---

## Query Example

```sql
-- Example: Search for "alignment technique" in chunks
SELECT 
  chunk_id,
  chunk_text,
  start_timestamp,
  end_timestamp,
  segment_markers,
  distance
FROM search_insight_chunks(
  query_embedding_vector,  -- 1536-dim vector from OpenAI
  10,                       -- Top 10 results
  0.5                       -- Similarity threshold
)
ORDER BY distance ASC;
```

---

## Backend Integration

### Update Your Chunking Service

```typescript
// In your existing chunking service
interface Chunk {
  text: string;
  embedding: number[];  // 1536 dimensions
  timestamp_start: string;
  timestamp_end: string;
  
  // NEW fields
  segment_markers: string[];  // ["0:00", "0:06", ...]
  final_version_reference_id: string;  // H-version UUID
}

// When creating chunks:
const chunks = segmentsToChunks(segments, targetVersionId);
// Populate segment_markers from segments
// Set final_version_reference_id to H-version
// Store in insight_chunks
```

### Update Pipeline Status

```typescript
// Track RAG indexing progress
await supabase
  .from('insight_pipeline_status')
  .update({
    rag_status: 'processing',
    rag_indexing_started_at: new Date(),
    rag_total_chunks: chunks.length
  })
  .eq('transcription_id', transcriptionId);
```

---

## Frontend Integration

### Display RAG Results

```typescript
// Show chunks with video jump links
const results = await searchChunks(query);

results.map(chunk => (
  <div key={chunk.id}>
    <p>{chunk.chunk_text}</p>
    <div>
      {chunk.segment_markers.map(timestamp => (
        <button onClick={() => jumpToVideo(timestamp)}>
          Jump to {timestamp}
        </button>
      ))}
    </div>
  </div>
));
```

---

## Rollback

If you need to rollback:

```bash
# Uncomment the rollback section in the migration file
# Then run it
psql -d your_db -f rollback.sql
```

---

## Compatibility

✅ **Fully compatible** with:
- Your existing `insight_chunks` structure
- Your existing 1536-dim embeddings
- Your existing `insight_transcripts` workflow
- Your existing API endpoints
- Your existing RLS policies
- Your existing chunking logic

❌ **Not compatible** with:
- 384-dim embeddings (keep using 1536)
- Direct chunking from `max_transcriptions` (use `insight_transcripts`)

---

## Next Steps

1. **Review** the migration file
2. **Test** on staging
3. **Apply** to production
4. **Update** your chunking service to populate new fields
5. **Build** RAG query interface
6. **Integrate** with Claude for synthesis

---

## Questions?

See `RAG_MIGRATION_ANALYSIS.md` for detailed comparison with proposed migration.

