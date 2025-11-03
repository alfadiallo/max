-- Quick debug queries to check Insight data

-- 1. Check if metadata exists
SELECT id, insight_transcript_id, review_status, created_at
FROM insight_metadata 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check metadata fields
SELECT 
  id,
  learning_objectives,
  procedures_discussed,
  products_or_tools,
  clinical_domain,
  flags
FROM insight_metadata 
ORDER BY created_at DESC 
LIMIT 1;

-- 3. Check tags
SELECT tag_type, tag_value, COUNT(*) as count
FROM insight_tags 
GROUP BY tag_type, tag_value
ORDER BY count DESC;

-- 4. Check pipeline status
SELECT status, current_stage, error_message, completed_at
FROM insight_pipeline_status 
ORDER BY created_at DESC 
LIMIT 1;


