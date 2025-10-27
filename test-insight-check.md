# Quick Supabase Verification Queries

Run these in Supabase SQL Editor to verify the data:

## 1. Check if transcript was cloned
```sql
SELECT id, transcription_id, status, created_at 
FROM insight_transcripts 
ORDER BY created_at DESC 
LIMIT 1;
```

## 2. Check metadata extraction
```sql
SELECT 
  learning_objectives, 
  procedures_discussed, 
  products_or_tools,
  clinical_domain,
  target_audience,
  review_status
FROM insight_metadata 
ORDER BY created_at DESC 
LIMIT 1;
```

## 3. Check tags
```sql
SELECT tag_type, tag_value 
FROM insight_tags 
ORDER BY created_at DESC;
```

## 4. Check pipeline status
```sql
SELECT status, current_stage, completed_at 
FROM insight_pipeline_status 
ORDER BY created_at DESC 
LIMIT 1;
```
