# RAG Data Source - Which Version is Indexed?

## Quick Answer

**RAG indexes the FINAL VERSION** of each transcript, as determined by `max_transcriptions.final_version_id`.

---

## Detailed Explanation

### Data Flow

```
User marks transcript as "Final"
    ↓
max_transcriptions.final_version_id is set
    ↓
User sends to Insight
    ↓
insight_transcripts created (clone of final version)
    ↓
User generates chunks
    ↓
RAG indexes insight_transcripts (which is the final version)
```

---

## Version Options

### Option 1: T-1 (Raw Whisper)
**When:** `final_version_id = null`  
**Source:** Original Whisper transcription  
**Characteristics:**
- Unedited
- May have errors
- Timestamped segments from Whisper

**Use Case:** User wants to index raw transcripts without human edits

---

### Option 2: H-Version (Human-Edited)
**When:** `final_version_id = 'some-uuid'`  
**Source:** A specific human-edited version (H-1, H-2, H-3, etc.)  
**Characteristics:**
- Human-reviewed and corrected
- Clinical accuracy improved
- Better for educational content

**Use Case:** Most common - user wants to index the approved, edited version

---

## How It's Determined

### Step 1: User Sets Final Version

When a user "Promotes to Final", the system sets:
```typescript
max_transcriptions.final_version_id = versionId // or null for T-1
```

### Step 2: Send to Insight

In `/api/insight/send-to-brain`:

```typescript
// Get final version
if (transcription.final_version_id === null) {
  // Use T-1
  finalVersion = {
    edited_text: transcription.raw_text,
    json_with_timestamps: transcription.json_with_timestamps
  }
} else {
  // Use H-version
  const { data } = await supabase
    .from('max_transcription_versions')
    .select('id, edited_text, json_with_timestamps')
    .eq('id', transcription.final_version_id)
    .single()
  
  finalVersion = data
}

// Clone to insight_transcripts
await supabase.from('insight_transcripts').insert({
  source_final_version_id: finalVersion.id,
  text: finalVersion.edited_text,
  json_with_timestamps: finalVersion.json_with_timestamps
})
```

### Step 3: Generate Chunks

In `/api/insight/chunk`:

```typescript
// Get insight_transcripts (which is already the final version)
const { data: insightTranscript } = await supabase
  .from('insight_transcripts')
  .select('id, text, json_with_timestamps, source_final_version_id')
  .eq('transcription_id', transcriptionId)
  .single()

// Chunk from this transcript
const segments = insightTranscript.json_with_timestamps?.segments

// Store with reference
{
  segment_markers: [...],
  final_version_reference_id: insightTranscript.source_final_version_id
}
```

---

## Tracking

### What Gets Stored

**In `insight_transcripts`:**
- `source_final_version_id` - Which version was cloned
- `source_is_t1` - Boolean if it's T-1

**In `insight_chunks`:**
- `final_version_reference_id` - Which H-version (or T-1) was the source

**In `insight_transcripts`:**
- `indexed_final_version_id` - Confirms which version was indexed
- `indexed_at` - When it was indexed
- `indexed_by` - Who triggered it

---

## Audit Trail

You can always trace back:

```sql
-- Find which version was indexed for RAG
SELECT 
  t.id,
  t.transcription_id,
  t.source_final_version_id,
  t.indexed_at,
  v.version_type,
  v.version_number
FROM insight_transcripts t
LEFT JOIN max_transcription_versions v ON v.id = t.source_final_version_id
WHERE t.transcription_id = 'your-transcription-id';
```

---

## Re-indexing

### If Final Version Changes

**Current behavior:**
- No automatic re-indexing
- `insight_transcripts` stays as original clone

**To re-index:**
1. Delete old `insight_transcripts` record
2. Delete old chunks
3. Re-send to Insight
4. Re-generate chunks

**Future enhancement:**
- Could add automatic re-indexing
- Could track when source changes
- Could trigger background update

---

## Best Practices

### ✅ Recommended Workflow

1. **Edit transcript** thoroughly (H-1, H-2, H-3)
2. **Promote to Final** when satisfied (e.g., H-3)
3. **Send to Insight** (clones final version)
4. **Generate chunks** (indexes final version)
5. **Use RAG** (searches indexed chunks)

### ⚠️ Considerations

**For Clinical/Educational Content:**
- Always use a human-edited H-version, not T-1
- Ensure corrections are complete before indexing

**For Raw Content:**
- T-1 is acceptable if you want to search original transcripts
- May include Whisper errors

---

## Example Scenarios

### Scenario 1: Standard Workflow
```
T-1 → H-1 (fix typos) → H-2 (fix terms) → H-3 (Final)
                                         ↓
                               Send to Insight
                                         ↓
                              Generate Chunks
                                         ↓
                            RAG indexes H-3 content
```

### Scenario 2: T-1 Only
```
T-1 (Final - no edits needed)
         ↓
Send to Insight
         ↓
Generate Chunks
         ↓
RAG indexes T-1 content
```

### Scenario 3: Re-editing After Indexing
```
H-3 (Final) → Indexed for RAG
         ↓
User decides H-3 needs changes
         ↓
Create H-4 → Promote H-4 as Final
         ↓
⚠️ RAG still has H-3 indexed
         ↓
Manual re-indexing needed
```

---

## Summary

**RAG indexes:**
- ✅ The FINAL VERSION (H-X or T-1)
- ✅ As determined by `final_version_id`
- ✅ Cloned to `insight_transcripts` first
- ✅ Fully audited and traceable

**Not indexed:**
- ❌ Intermediate versions (e.g., H-1 if H-3 is final)
- ❌ Draft versions
- ❌ Untagged versions

---

## Code References

- **Final Version Detection:** `src/app/api/insight/send-to-brain/route.ts` (lines 37-59)
- **Insight Transcript Creation:** `src/app/api/insight/send-to-brain/route.ts` (lines 83-95)
- **Chunking from Final Version:** `src/app/api/insight/chunk/route.ts` (lines 21-29)
- **Tracking Reference:** `src/app/api/insight/chunk/route.ts` (lines 173-174, 186-194)

