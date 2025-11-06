# Changelog

All notable changes to the Max project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2025-11-06

### Fixed
- **Translation Segment Alignment**: Fixed critical alignment issue between English and translation segments
  - Translation segments now have identical IDs, timestamps (start/end), and seek values as their corresponding English segments
  - Ensures perfect 1:1 alignment for side-by-side editing
  - Translation API now preserves exact English segment structure (only text is translated)
- **Sentence-Level Editing**: Improved sentence splitting for translation editing
  - Uses word-level timestamps from Sonix/Whisper for accurate sentence boundaries
  - Both left (English) and right (translation) columns now have identical timestamps
  - Perfect vertical alignment in side-by-side view
- **Translation UI**: Removed old modal popup, improved inline editing experience
  - Translation text now properly displays in editable fields
  - Removed confusing popup that appeared before side-by-side view
  - Fixed translation segment initialization to match English sentence structure

### Changed
- Translation generation API (`/api/transcriptions/[id]/translate`) now ensures 1:1 segment alignment
  - Each translation segment inherits exact ID, start, end, and seek from English segment
  - Improved matching algorithm to handle timestamp variations
- Display logic updated to match segments by ID first, then by index
  - Ensures perfect alignment even when sentence counts differ slightly
  - Timestamps are always preserved from English segments

### Technical Details
- Updated `src/app/api/transcriptions/[id]/translate/route.ts`:
  - Segment matching now uses exact ID and timestamp matching
  - Fallback logic ensures every English segment has a corresponding translation segment
- Updated `src/components/audio/TranscriptionView.tsx`:
  - Sentence splitting uses word-level timestamps for accurate boundaries
  - Translation segments use identical structure as English segments
  - Fixed initialization to properly display translation text

---

## [2.0.0] - 2025-11-03

### Added
- **Sonix AI Integration**: Full integration with Sonix AI for video transcription
  - Import existing transcriptions from Sonix account
  - Support for video files (in addition to audio)
  - Word-level timestamps for precise video sync
  - Admin UI at `/admin/sonix/import` for managing Sonix imports
  - Automatic conversion from Sonix format to Max internal format
- **Enhanced Transcription Format**: 
  - Support for nested word-level timestamps (Sonix-style)
  - Improved timestamp precision for video synchronization
- **New API Endpoints**:
  - `GET /api/sonix/import` - List Sonix media files (Admin only)
  - `POST /api/sonix/import` - Import Sonix transcript into Max
- **New Database Fields**:
  - `max_audio_files`: `sonix_media_id`, `file_type`, `sonix_status`
  - `max_transcriptions`: `source` field to track transcription service
- **New Libraries**:
  - Sonix API client (`src/lib/sonix/client.ts`)
  - Sonix format converter (`src/lib/utils/sonixConverter.ts`)

### Changed
- Updated transcription format to use nested word timestamps (Sonix-style)
- Enhanced error handling and validation for transcript conversion
- Improved logging for debugging transcript imports

### Fixed
- Fixed transcript format conversion to handle Sonix API response structure
- Fixed TypeScript type errors in converter utilities
- Improved error messages for better debugging

---

## [1.0.0] - 2024-10-25

### Added
- Initial release of Max platform
- Audio upload and transcription via OpenAI Whisper
- Transcription editing with versioning
- Multi-language translation via Claude
- Dictionary management for terminology
- Summary generation (Email, LinkedIn, Blog)
- User authentication and project management

---

[2.0.0]: https://github.com/alfadiallo/max/releases/tag/v2.0.0
[1.0.0]: https://github.com/alfadiallo/max/releases/tag/v1.0.0
