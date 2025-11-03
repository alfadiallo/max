# Sonix → ElevenLabs Workflow Integration

## Overview

This document explains how Sonix transcription output integrates with Max's translation and ElevenLabs dubbing workflow.

## Sonix Output Format

Sonix provides transcriptions in multiple formats:

### 1. CSV Format (What you provided)
```csv
Word,Start Timecode,End Timecode,Speaker
Hi.,00:00:00:20,00:00:01:06,Speaker1
On,00:00:01:08,00:00:01:15,Speaker1
```

**Key Features:**
- **Word-level timestamps**: Every word has precise start/end times
- **Timecode format**: `HH:MM:SS:FF` (hours:minutes:seconds:frames, typically 24fps)
- **Speaker identification**: Useful for multi-speaker scenarios
- **High precision**: Frame-level accuracy for video sync

### 2. JSON Format (Preferred, if available)
Sonix also provides JSON via API endpoint `/v1/media/{id}/transcript.json`:
```json
{
  "segments": [
    {
      "id": 1,
      "start": 0.33,
      "end": 1.2,
      "text": "Hi. On this video we're going to talk about...",
      "words": [
        {"word": "Hi.", "start": 0.33, "end": 0.6},
        {"word": "On", "start": 0.67, "end": 0.72}
      ]
    }
  ],
  "full_text": "Hi. On this video..."
}
```

## Conversion to Max Format

The `sonixConverter.ts` utility converts Sonix output to Max's internal format:

### For CSV:
```typescript
import { convertSonixCSVToMaxFormat } from '@/lib/utils/sonixConverter'

const csvContent = await fetchSonixCSV(mediaId)
const maxFormat = convertSonixCSVToMaxFormat(csvContent, fps: 24)
```

### For JSON:
```typescript
import { convertSonixJSONToMaxFormat } from '@/lib/utils/sonixConverter'

const sonixJSON = await fetch(`/v1/media/${mediaId}/transcript.json`)
const maxFormat = convertSonixJSONToMaxFormat(await sonixJSON.json())
```

## Max Internal Format

```typescript
{
  raw_text: "Hi. On this video we're going to talk about what types of cases...",
  json_with_timestamps: {
    segments: [
      {
        id: 0,
        seek: 330,        // milliseconds
        start: 0.33,      // seconds (decimal)
        end: 6.06,        // seconds
        text: "Hi. On this video we're going to talk about what types of cases...",
        words: [
          { word: "Hi.", start: 0.33, end: 0.6 },
          { word: "On", start: 0.67, end: 0.72 }
        ]
      }
    ],
    words: [...], // All words flattened
    metadata: {
      source: 'sonix',
      speaker_count: 1,
      duration: 600.08  // Total video duration in seconds
    }
  }
}
```

## Workflow: Sonix → Translation → ElevenLabs

### Step 1: Upload to Sonix (Video/Audio)
1. Upload video/audio file to Sonix
2. Wait for transcription to complete
3. Fetch transcript via API or CSV export

### Step 2: Store in Max Database
```typescript
// API route: /api/transcriptions/sonix/import
const maxFormat = convertSonixJSONToMaxFormat(sonixJSON)

await supabase
  .from('max_transcriptions')
  .insert({
    audio_file_id, // or video_file_id
    transcription_type: 'T-1',
    language_code: 'en',
    raw_text: maxFormat.raw_text,
    json_with_timestamps: maxFormat.json_with_timestamps,
    created_by: user.id
  })
```

### Step 3: Translation (Claude)
**Uses segment timestamps for alignment:**
```typescript
// Translation API route uses segments:
const segments = transcription.json_with_timestamps.segments
// Input to Claude: [0.33-6.06] Hi. On this video...
// Claude preserves timestamps: [0.33-6.06] Hola. En este video...
```

**Key Point**: Timestamps are preserved so translated segments align with original video timing.

### Step 4: Speech Generation (ElevenLabs)
**Uses translated text + segment timing:**
```typescript
// Speech generation route:
const translatedText = translation.translated_text // Full text
const segments = translation.json_with_timestamps.segments // Timestamps

// Calculate expected duration for sync
const expectedDuration = segments[segments.length - 1].end

// Generate speech with ElevenLabs
await elevenlabsClient.textToSpeech.convert(voiceId, {
  text: translatedText,
  modelId: 'eleven_multilingual_v2'
})
```

**Key Point**: Segment timestamps (`segments[last].end`) are used to calculate expected duration for video/audio synchronization.

## Why Timestamps Matter

### For Translation:
- Claude receives segments with timestamps: `[0.33-6.06] English text...`
- Claude preserves timestamps: `[0.33-6.06] Translated text...`
- Ensures translated segments align with original video timing

### For Dubbing:
- ElevenLabs generates speech from full translated text
- Segment timestamps provide timing reference for video sync
- Word-level timestamps (from Sonix) enable frame-accurate dubbing

## Advantages of Sonix Word-Level Timestamps

1. **Frame-Accurate Dubbing**: Word-level timestamps enable precise lip-sync
2. **Better Segmentation**: More accurate segment boundaries than sentence-based
3. **Multi-Speaker Support**: Speaker identification allows separate handling
4. **Video Support**: Native video transcription with video sync

## Example: Full Workflow

```typescript
// 1. Get Sonix transcript
const sonixResponse = await fetch(`https://api.sonix.ai/v1/media/${mediaId}/transcript.json`, {
  headers: { 'Authorization': `Bearer ${SONIX_API_KEY}` }
})
const sonixJSON = await sonixResponse.json()

// 2. Convert to Max format
const maxFormat = convertSonixJSONToMaxFormat(sonixJSON)

// 3. Store in database
const { data: transcription } = await supabase
  .from('max_transcriptions')
  .insert({ ...maxFormat, audio_file_id })
  .select()
  .single()

// 4. Translate (uses segments with timestamps)
const { data: translation } = await fetch(`/api/transcriptions/${transcription.id}/translate`, {
  method: 'POST',
  body: JSON.stringify({ language_code: 'sp' })
})

// 5. Generate speech (uses translated text + segment timing)
const { data: speech } = await fetch('/api/speech/generate', {
  method: 'POST',
  body: JSON.stringify({
    translation_id: translation.id,
    language_code: 'sp'
  })
})

// Result: Dubbed video with frame-accurate timing
```

## Next Steps

1. **Create Sonix import API route**: `/api/transcriptions/sonix/import`
2. **Add Sonix media upload integration**: Direct upload from Max UI
3. **Poll Sonix status**: Check transcription completion
4. **Handle multi-speaker**: Separate segments by speaker for dubbing
5. **Video file support**: Extend Max to handle video files (not just audio)

