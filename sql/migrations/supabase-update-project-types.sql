-- =====================================================
-- Update Project Types
-- =====================================================
-- Renames ISA to "KE Track - Invisalign Smile Architect"
-- Adds "KE Track - Team"
-- =====================================================

-- Step 1: Update ISA to KE Track - Invisalign Smile Architect
UPDATE max_project_types 
SET name = 'KE Track - Invisalign Smile Architect',
    slug = 'ke-track-isa'
WHERE slug = 'isa';

-- Step 2: Add new KE Track - Team project type
INSERT INTO max_project_types (name, slug)
VALUES ('KE Track - Team', 'ke-track-team')
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Update file paths in max_audio_files that used 'isa' directory
-- Note: This updates the stored file_path metadata in the database
-- The actual files in Supabase Storage will need to be renamed via Storage UI
UPDATE max_audio_files
SET file_path = REPLACE(file_path, 'audio/isa/', 'audio/ke-track-isa/')
WHERE file_path LIKE 'audio/isa/%';

-- Verify the changes
SELECT name, slug FROM max_project_types ORDER BY name;

