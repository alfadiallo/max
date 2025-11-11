-- Test RAG Search Manually
-- This simulates what the search API does

-- First, let's check if we can find segments with a simple test
SELECT 
  id,
  sequence_number,
  LEFT(segment_text, 100) as preview,
  embedding IS NOT NULL as has_embedding
FROM content_segments
WHERE segment_text ILIKE '%dsd%' OR segment_text ILIKE '%digital%'
LIMIT 5;

-- Check if any segments contain relevant keywords
SELECT 
  COUNT(*) as total_segments,
  COUNT(*) FILTER (WHERE segment_text ILIKE '%dsd%') as has_dsd,
  COUNT(*) FILTER (WHERE segment_text ILIKE '%digital%') as has_digital,
  COUNT(*) FILTER (WHERE segment_text ILIKE '%invisalign%') as has_invisalign
FROM content_segments;

-- Test the match_rag_content function with a dummy embedding
-- (This won't work directly, but shows the function signature)
-- You need to generate a real embedding from OpenAI for the query "tell me about dsd"

-- To properly test, you'd need to:
-- 1. Generate an embedding for "tell me about dsd" using OpenAI
-- 2. Pass it to match_rag_content
-- 3. See what distance values you get

-- Instead, let's check what distance threshold would work
-- by seeing the distribution of embedding distances
SELECT 
  'If you had a query embedding, distances would range from 0.0 to 2.0' as note,
  'Current threshold: 0.7' as threshold,
  'Try lowering to 0.8 or 0.9 if no results' as suggestion;

