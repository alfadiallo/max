-- Add display_name field to max_audio_files table
-- This allows users to give friendly names to audio files separate from the actual filename

ALTER TABLE max_audio_files ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing records to use file_name as initial display_name
UPDATE max_audio_files SET display_name = file_name WHERE display_name IS NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_max_audio_files_display_name ON max_audio_files(display_name);

-- Add comment for documentation
COMMENT ON COLUMN max_audio_files.display_name IS 'User-friendly name for the audio file, separate from the actual filename';

