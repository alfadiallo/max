# Speech Generation Implementation Plan

## Overview
Convert final edited translations into spoken audio using ElevenLabs API with support for both generic voices and voice cloning.

## Two-Tier System

### Tier 1: Generic Professional Voices (Available Now)
- **Use Case**: Quick speech generation without voice matching
- **Languages**: All 7 supported languages (Spanish, Portuguese, Arabic, French, German, Italian, Mandarin)
- **Voice Selection**: Professional multilingual voices from ElevenLabs
- **Implementation**: Direct API call → Get speech → Store in Supabase Storage
- **Timeline**: Immediate (can implement today)

### Tier 2: Voice Cloning (Original Speaker Match)
- **Use Case**: Educational content where speaker credibility matters
- **Requirements**: Original audio file from user
- **Process**:
  1. Extract voice sample from original audio (1-3 minutes of clean speech)
  2. Upload sample to ElevenLabs Voice Lab to create voice clone
  3. Store voice clone ID in database
  4. Generate speech using cloned voice
- **Timeline**: Next session (requires audio sample extraction logic)

## Recommended Workflow

```
1. User edits Spanish translation (Final)
2. User clicks "Generate Speech"
3. System checks: Does cloned voice exist?
   - YES → Use cloned voice (sounds like original speaker)
   - NO → Use generic professional voice (quick fallback)
4. Call ElevenLabs API to generate speech
5. Store audio in Supabase Storage
6. Display audio player in Translations tab
7. User can download for video editing
```

## API Endpoints Needed

### POST /api/speech/generate
- **Input**: `translation_id`, `language_code`, `use_voice_clone`
- **Process**: 
  1. Fetch final translation text
  2. Check for voice clone availability
  3. Call ElevenLabs API
  4. Store audio file
  5. Save record in `max_generated_speech`
- **Output**: Audio URL and metadata

### GET /api/speech/[translation_id]
- **Input**: `translation_id`
- **Output**: List of all generated speech for this translation

## UI/UX Flow

**Translations Tab → [Language] Card**
```
┌─────────────────────────────────────┐
│ 🇪🇸 Spanish                    ✓ Complete │
│ [Edit] [Generate Speech] [Download] │
│                                      │
│ Generated Audio:                     │
│ 🎵 speech_sp_H3_a1b2c3.mp3          │
│ [Play] [Download] [Regenerate]     │
└─────────────────────────────────────┘
```

## Database Schema
See `sql/migrations/supabase-create-speech-table.sql`

## ElevenLabs API Requirements

### Generic Voice (No cloning needed)
```typescript
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Headers: { "xi-api-key": API_KEY }
Body: {
  text: "translated text",
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.5
  }
}
```

### Voice Cloning (Requires clone first)
```typescript
// Step 1: Create voice clone (one-time per speaker)
POST https://api.elevenlabs.io/v1/voices/add
Body: {
  name: "speaker_name",
  files: [audio_file],
  description: "Clone of original speaker"
}

// Step 2: Use cloned voice for speech generation
// (same as generic voice but use cloned voice_id)
```

## Cost Considerations

- **Generic voices**: Included in base pricing (pay per character)
- **Voice cloning**: One-time cost ($5-10) per clone + usage fees
- **Storage**: Audio files stored in Supabase Storage (minimal cost)

## Recommended Implementation Order

1. **Now**: Generic voice for all 7 languages (quick win)
2. **Next**: Voice cloning setup UI (extract sample from original audio)
3. **Then**: Preview/download functionality
4. **Finally**: Bulk generation for multiple languages

## Success Metrics

- [ ] Can generate Spanish speech from final translation
- [ ] Audio quality is clear and natural
- [ ] Plays correctly in browser
- [ ] Can download MP3 for video editing
- [ ] Supports all 7 languages
- [ ] Voice cloning works (optional but desired)

## Next Steps

1. Create `/api/speech/generate` endpoint
2. Add "Generate Speech" button to Translations tab
3. Add audio player component for playback
4. Test with Spanish translation first
5. Expand to other languages
6. Add voice cloning workflow (optional)














