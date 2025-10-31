# RAG System Testing Checklist

## Pre-Migration Verification

### 1. Backup Database ✅ REQUIRED
```bash
# Create full backup before migration
pg_dump your_staging_db > backup_before_rag_$(date +%Y%m%d).sql
```

### 2. Check Current State
```sql
-- Verify insight_chunks structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'insight_chunks'
ORDER BY ordinal_position;

-- Check embedding dimension (should be 1536)
SELECT 
  (SELECT atttypmod 
   FROM pg_attribute 
   WHERE attrelid = 'insight_chunks'::regclass 
     AND attname = 'embedding' 
     AND atttypid = (SELECT oid FROM pg_type WHERE typname = 'vector')
  ) as vector_dimensions;

-- Count existing chunks
SELECT COUNT(*) FROM insight_chunks;

-- Count chunks with embeddings
SELECT COUNT(*) FROM insight_chunks WHERE embedding IS NOT NULL;
```

### 3. Check Extension
```sql
-- Verify pgvector extension exists
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## Migration Execution

### 1. Run Migration
```bash
# Apply to staging
psql -d your_staging_db -f sql/migrations/supabase-rag-extension-option-a.sql
```

### 2. Verify Migration Success
```sql
-- Check new columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'insight_chunks' 
  AND column_name IN ('segment_markers', 'final_version_reference_id');

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'insight_transcripts' 
  AND column_name IN ('indexed_final_version_id', 'indexed_at', 'indexed_by');

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'max_transcription_versions' 
  AND column_name = 'is_final';

-- Check indexes created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('insight_chunks', 'insight_transcripts', 'max_transcription_versions')
  AND indexname LIKE '%final%' OR indexname LIKE '%indexed%';
```

### 3. Check Functions
```sql
-- Verify search function exists
SELECT proname, proargtypes, prosrc 
FROM pg_proc 
WHERE proname = 'search_insight_chunks';

-- Verify trigger exists
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'trg_insight_chunks_indexed_status';
```

---

## Post-Migration Validation

### 1. Test Existing Queries Still Work
```sql
-- Your existing queries should work unchanged
SELECT * FROM insight_chunks WHERE embedding IS NOT NULL LIMIT 5;
SELECT * FROM insight_chunks WHERE 'dental' = ANY(tags) LIMIT 5;
SELECT * FROM insight_chunks WHERE timestamp_start_seconds > 100 LIMIT 5;
```

### 2. Test New Functionality
```sql
-- Test search_insight_chunks function
-- (Note: You'll need an actual embedding vector)

-- Example: Search with dummy embedding (will return empty but no error)
SELECT * FROM search_insight_chunks(
  '[0.1,0.2,0.3]'::vector,  -- Dummy embedding
  10,                        -- Limit
  0.5                        -- Threshold
);
```

### 3. Test Triggers
```sql
-- Create a test chunk and verify indexed_at is set
-- (If you have test data)

-- Check if trigger function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'update_insight_transcript_indexed_status';
```

---

## Integration Testing

### 1. Update Chunking Service
```typescript
// Test that new fields can be populated
const testChunk = {
  text: "Test chunk text",
  embedding: [0.1, 0.2, ...], // 1536 dimensions
  segment_markers: ["0:00", "0:06", "0:09"], // NEW
  final_version_reference_id: "some-uuid", // NEW
  // ... existing fields
};

// Insert into database
const result = await supabase
  .from('insight_chunks')
  .insert(testChunk)
  .select();

console.log('Insert result:', result);
```

### 2. Test Search API
```bash
# Test the search endpoint
curl -X POST http://localhost:3000/api/insight/rag-search \
  -H "Content-Type: application/json" \
  -d '{"query": "alignment technique", "limit": 10}'
```

### 3. Test Claude Integration
```typescript
// Test Claude RAG synthesis
const chunks = await searchChunks(query);
const response = await claude.chat({
  messages: [{ role: "user", content: formatQuery(query, chunks) }]
});

console.log('Claude response:', response);
```

---

## Data Quality Checks

### 1. Verify Segment Markers
```sql
-- Check segment markers are properly formatted
SELECT 
  id,
  segment_markers,
  jsonb_typeof(segment_markers) as marker_type
FROM insight_chunks 
WHERE segment_markers IS NOT NULL 
LIMIT 10;

-- Verify they're arrays
SELECT id, segment_markers
FROM insight_chunks
WHERE segment_markers IS NOT NULL
  AND jsonb_typeof(segment_markers) != 'array'
LIMIT 10;
```

### 2. Verify Version References
```sql
-- Check foreign key integrity
SELECT 
  ic.id,
  ic.final_version_reference_id,
  mtv.version_type
FROM insight_chunks ic
LEFT JOIN max_transcription_versions mtv ON mtv.id = ic.final_version_reference_id
WHERE ic.final_version_reference_id IS NOT NULL
LIMIT 10;

-- Find orphaned references (should be none)
SELECT 
  ic.id,
  ic.final_version_reference_id
FROM insight_chunks ic
LEFT JOIN max_transcription_versions mtv ON mtv.id = ic.final_version_reference_id
WHERE ic.final_version_reference_id IS NOT NULL
  AND mtv.id IS NULL;
```

---

## Performance Testing

### 1. Index Performance
```sql
-- Test search performance with explain
EXPLAIN ANALYZE
SELECT * FROM search_insight_chunks(
  '[0.1,0.2,0.3]'::vector,
  10,
  0.5
);

-- Should use idx_insight_chunks_embedding index
```

### 2. Embedding Dimension Check
```sql
-- Verify all embeddings are 1536-dim
SELECT 
  id,
  array_length((embedding::text)::float[], 1) as embedding_dim
FROM insight_chunks
WHERE embedding IS NOT NULL
  AND array_length((embedding::text)::float[], 1) != 1536
LIMIT 10;
-- Should return 0 rows
```

---

## Rollback Testing

### 1. Test Rollback Script
```bash
# On a COPY of staging database, test rollback
psql -d staging_copy -f rollback_from_options_a.sql

# Verify all changes reverted
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'insight_chunks' 
AND column_name IN ('segment_markers', 'final_version_reference_id');
-- Should return 0 rows after rollback
```

---

## Production Readiness

### Pre-Production Checklist
- [ ] All staging tests pass
- [ ] Rollback tested and verified
- [ ] Backup created
- [ ] Team notified of deployment
- [ ] Monitoring in place
- [ ] Documentation updated
- [ ] Chunking service updated
- [ ] Search API endpoint built
- [ ] Claude integration tested
- [ ] UI components ready

### Production Deployment
```bash
# 1. Backup production
pg_dump production_db > backup_production_$(date +%Y%m%d).sql

# 2. Apply migration
psql -d production_db -f sql/migrations/supabase-rag-extension-option-a.sql

# 3. Verify
psql -d production_db -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'insight_chunks' AND column_name IN ('segment_markers', 'final_version_reference_id');"
```

---

## Expected Outcomes

### After Migration
- ✅ All existing queries still work
- ✅ New columns added (NULL values initially)
- ✅ Search function available
- ✅ Trigger auto-updates indexed_at
- ✅ No performance degradation

### After Chunking Update
- ✅ New chunks have segment_markers populated
- ✅ New chunks have final_version_reference_id set
- ✅ Search returns results with timestamps
- ✅ Video jump links work

### After Full Implementation
- ✅ RAG search functioning
- ✅ Claude synthesis working
- ✅ UI displays results
- ✅ Video timestamps clickable

---

## Known Issues & Mitigations

| Issue | Impact | Mitigation |
|-------|--------|------------|
| Empty segment_markers initially | None | Populated on next chunk generation |
| NULL final_version_reference_id initially | None | Set on next indexing |
| OpenAI API cost | Low | $60 per 100 hours acceptable |

---

## Success Criteria

✅ **Migration Success:**
- Columns added without errors
- Indexes created
- Functions available
- No data loss

✅ **Integration Success:**
- Chunks populate new fields
- Search returns results
- Performance acceptable

✅ **Feature Success:**
- RAG search working
- Claude synthesis accurate
- Video links functional

---

## Next Steps After Testing

1. Update chunking service to populate new fields
2. Build RAG search API endpoint
3. Integrate Claude for synthesis
4. Build search UI
5. Test with real queries
6. Deploy to production

