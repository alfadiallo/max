-- =====================================================
-- RAG SYSTEM EXTENSION - OPTION A
-- =====================================================
-- Modified migration to work with existing insight_chunks schema
-- Safe, non-breaking additions only
-- =====================================================

-- =====================================================
-- STEP 1: Add RAG columns to insight_chunks (existing table)
-- =====================================================
-- This extends your existing insight_chunks table with:
-- 1. segment_markers - Array of timestamps for video links
-- 2. final_version_reference_id - Audit trail of which version was indexed

ALTER TABLE insight_chunks 
ADD COLUMN IF NOT EXISTS segment_markers JSONB,
ADD COLUMN IF NOT EXISTS final_version_reference_id UUID;

-- Add foreign key constraint for final version reference
ALTER TABLE insight_chunks
ADD CONSTRAINT fk_insight_chunks_final_version 
  FOREIGN KEY (final_version_reference_id) 
  REFERENCES max_transcription_versions(id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_insight_chunks_final_version_ref 
  ON insight_chunks(final_version_reference_id);

-- Add comments for documentation
COMMENT ON COLUMN insight_chunks.segment_markers 
  IS 'JSON array of timestamp strings marking segment boundaries within this chunk.
      Format: ["0:00", "0:06", "0:09", "0:16", "0:21"]
      Used to generate precise video jump links for RAG results.';

COMMENT ON COLUMN insight_chunks.final_version_reference_id 
  IS 'UUID of the max_transcription_versions record (H-version) used as source.
      Provides audit trail of which version was chunked and indexed.
      Chunks flow: H-version → insight_transcripts → insight_chunks';

-- =====================================================
-- STEP 2: Add RAG tracking columns to insight_transcripts
-- =====================================================
-- Track when transcripts are indexed for RAG search
-- This goes on insight_transcripts (not max_transcriptions) because
-- your chunks reference insight_transcript_id

ALTER TABLE insight_transcripts 
ADD COLUMN IF NOT EXISTS indexed_final_version_id UUID,
ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS indexed_by UUID;

-- Add foreign key constraint
ALTER TABLE insight_transcripts
ADD CONSTRAINT fk_insight_transcripts_indexed_version 
  FOREIGN KEY (indexed_final_version_id) 
  REFERENCES max_transcription_versions(id) ON DELETE SET NULL;

-- Add foreign key for indexed_by
ALTER TABLE insight_transcripts
ADD CONSTRAINT fk_insight_transcripts_indexed_by 
  FOREIGN KEY (indexed_by) 
  REFERENCES max_users(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insight_transcripts_indexed_version 
  ON insight_transcripts(indexed_final_version_id);

CREATE INDEX IF NOT EXISTS idx_insight_transcripts_indexed_at 
  ON insight_transcripts(indexed_at DESC);

-- Add comments
COMMENT ON COLUMN insight_transcripts.indexed_final_version_id 
  IS 'UUID of the max_transcription_versions record used for RAG indexing.
      Tracks which H-version (e.g., H-3) was chunked and embedded.';

COMMENT ON COLUMN insight_transcripts.indexed_at 
  IS 'Timestamp when this insight transcript was indexed for RAG search.';

COMMENT ON COLUMN insight_transcripts.indexed_by 
  IS 'UUID of the user/service that triggered the RAG indexing.';

-- =====================================================
-- STEP 3: Add is_final flag to max_transcription_versions
-- =====================================================
-- Allows quick identification of versions ready for indexing

ALTER TABLE max_transcription_versions 
ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;

-- Create index for finding final versions efficiently
CREATE INDEX IF NOT EXISTS idx_max_transcription_versions_is_final 
  ON max_transcription_versions(is_final) WHERE is_final = TRUE;

COMMENT ON COLUMN max_transcription_versions.is_final 
  IS 'Boolean flag: is this version marked as final and ready for RAG indexing?
      Allows quick identification of versions to process.
      Set to TRUE when version is promoted to final.';

-- =====================================================
-- STEP 4: Create trigger to auto-update indexed_at when chunks created
-- =====================================================
-- Automatically track when chunks are created/updated for a transcript

CREATE OR REPLACE FUNCTION update_insight_transcript_indexed_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a chunk is inserted/updated, mark the insight_transcript as indexed
  UPDATE insight_transcripts 
  SET indexed_at = CURRENT_TIMESTAMP
  WHERE id = NEW.insight_transcript_id 
    AND indexed_at IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_insight_chunks_indexed_status ON insight_chunks;
CREATE TRIGGER trg_insight_chunks_indexed_status
AFTER INSERT OR UPDATE ON insight_chunks
FOR EACH ROW
EXECUTE FUNCTION update_insight_transcript_indexed_status();

COMMENT ON FUNCTION update_insight_transcript_indexed_status 
  IS 'Automatically sets insight_transcripts.indexed_at when chunks are created or updated';

-- =====================================================
-- STEP 5: Create helper function for vector similarity search
-- =====================================================
-- Your existing embedding is 1536-dim (OpenAI text-embedding-3-small)
-- Keep using that - don't change dimensions!

CREATE OR REPLACE FUNCTION search_insight_chunks(
  p_query_embedding vector,
  p_limit INT DEFAULT 10,
  p_distance_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id UUID,
  insight_transcript_id UUID,
  chunk_text TEXT,
  start_timestamp VARCHAR(10),
  end_timestamp VARCHAR(10),
  segment_markers JSONB,
  distance FLOAT,
  chunk_number INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ic.id,
    ic.insight_transcript_id,
    ic.text,
    ic.timestamp_start,
    ic.timestamp_end,
    ic.segment_markers,
    (ic.embedding <=> p_query_embedding)::FLOAT AS distance,
    ic.chunk_number
  FROM insight_chunks ic
  WHERE ic.embedding IS NOT NULL
    AND (ic.embedding <=> p_query_embedding) < p_distance_threshold
  ORDER BY distance ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_insight_chunks 
  IS 'Search for insight_chunks similar to a query embedding (1536 dimensions).
      Returns top-N most similar chunks with similarity distances.
      Usage: SELECT * FROM search_insight_chunks(query_embedding_vector, 10, 0.5);';

-- =====================================================
-- STEP 6: Extend insight_pipeline_status for RAG tracking
-- =====================================================
-- Your existing table already has chunking tracking
-- Just add RAG-specific fields if needed

ALTER TABLE insight_pipeline_status 
ADD COLUMN IF NOT EXISTS rag_indexing_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rag_indexing_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rag_status TEXT CHECK (rag_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS rag_total_chunks INT,
ADD COLUMN IF NOT EXISTS rag_embedded_chunks INT;

COMMENT ON COLUMN insight_pipeline_status.rag_status 
  IS 'Status of RAG indexing pipeline for this transcript';

-- =====================================================
-- STEP 7: Verification queries (run after migration)
-- =====================================================

-- Check new columns exist
-- UNCOMMENT TO RUN:
/*
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'insight_chunks' 
  AND column_name IN ('segment_markers', 'final_version_reference_id');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'insight_transcripts' 
  AND column_name IN ('indexed_final_version_id', 'indexed_at', 'indexed_by');

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'insight_chunks' 
  AND indexname = 'idx_insight_chunks_final_version_ref';

SELECT indexname FROM pg_indexes 
WHERE tablename = 'insight_transcripts' 
  AND indexname IN (
    'idx_insight_transcripts_indexed_version',
    'idx_insight_transcripts_indexed_at'
  );

-- Check pgvector extension (should already exist)
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check embedding dimension (should be 1536)
SELECT 
  table_name,
  column_name,
  (SELECT atttypmod 
   FROM pg_attribute 
   WHERE attrelid = c.table_name::regclass 
     AND attname = c.column_name 
     AND atttypid = (SELECT oid FROM pg_type WHERE typname = 'vector')
  ) as vector_dimensions
FROM information_schema.columns c
WHERE table_name = 'insight_chunks' 
  AND column_name = 'embedding';

-- Check function exists
SELECT * FROM pg_proc WHERE proname = 'search_insight_chunks';

-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trg_insight_chunks_indexed_status';
*/

-- =====================================================
-- STEP 8: Rollback script (if needed)
-- =====================================================
-- UNCOMMENT AND RUN TO ROLLBACK ALL CHANGES

/*
-- Drop trigger
DROP TRIGGER IF EXISTS trg_insight_chunks_indexed_status ON insight_chunks;
DROP FUNCTION IF EXISTS update_insight_transcript_indexed_status();

-- Drop function
DROP FUNCTION IF EXISTS search_insight_chunks(vector, INT, FLOAT);

-- Drop indexes
DROP INDEX IF EXISTS idx_insight_chunks_final_version_ref;
DROP INDEX IF EXISTS idx_insight_transcripts_indexed_version;
DROP INDEX IF EXISTS idx_insight_transcripts_indexed_at;
DROP INDEX IF EXISTS idx_max_transcription_versions_is_final;

-- Drop columns from insight_chunks
ALTER TABLE insight_chunks 
  DROP CONSTRAINT IF EXISTS fk_insight_chunks_final_version,
  DROP COLUMN IF EXISTS segment_markers,
  DROP COLUMN IF EXISTS final_version_reference_id;

-- Drop columns from insight_transcripts
ALTER TABLE insight_transcripts
  DROP CONSTRAINT IF EXISTS fk_insight_transcripts_indexed_version,
  DROP CONSTRAINT IF EXISTS fk_insight_transcripts_indexed_by,
  DROP COLUMN IF EXISTS indexed_final_version_id,
  DROP COLUMN IF EXISTS indexed_at,
  DROP COLUMN IF EXISTS indexed_by;

-- Drop columns from max_transcription_versions
ALTER TABLE max_transcription_versions
  DROP COLUMN IF EXISTS is_final;

-- Drop columns from insight_pipeline_status
ALTER TABLE insight_pipeline_status
  DROP COLUMN IF EXISTS rag_indexing_started_at,
  DROP COLUMN IF EXISTS rag_indexing_completed_at,
  DROP COLUMN IF EXISTS rag_status,
  DROP COLUMN IF EXISTS rag_total_chunks,
  DROP COLUMN IF EXISTS rag_embedded_chunks;
*/

-- =====================================================
-- END OPTION A MIGRATION
-- =====================================================
-- Summary of changes:
-- 1. Added segment_markers and final_version_reference_id to insight_chunks
-- 2. Added indexing tracking columns to insight_transcripts
-- 3. Added is_final flag to max_transcription_versions
-- 4. Created auto-update trigger for indexed_at
-- 5. Created search helper function for 1536-dim embeddings
-- 6. Extended insight_pipeline_status for RAG tracking
-- 7. All changes are backward compatible

