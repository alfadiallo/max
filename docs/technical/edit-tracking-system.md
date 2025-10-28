# Edit Tracking & Automated Correction System

## Overview

This system tracks all edits made to Whisper transcriptions and learns from them to automatically correct future transcriptions.

## Goals

1. **Track every edit** made to English transcriptions
2. **Learn correction patterns** to automate future edits
3. **Build a dictionary** of original → corrected terms
4. **Preserve complete history** of all transcript versions

## Data Model

### 1. Transcription Versions (`max_transcription_versions`)

**New column:** `dictionary_corrections_applied` (JSONB)

Stores all word-level edits for each version:

```json
[
  {
    "original_text": "wire em up",
    "corrected_text": "wire them up",
    "position": [120, 128],  // Character positions in original text
    "context_before": "then I",
    "context_after": "properly"
  },
  {
    "original_text": "parafin wax",
    "corrected_text": "paraffin wax",
    "position":但对 [450, 460],
    "context_before": "using",
    "context_after": "blocks"
  }
]
```

### 2. Correction Patterns (`max_transcription_correction_patterns`)

Global dictionary learned from all user edits:

| Column | Type | Description |
|--------|------|-------------|
| `original_text` | TEXT | Incorrect text from Whisper |
| `corrected_text` | TEXT | Corrected version |
| `context_before` | TEXT | Text before the correction |
| `context_after` | TEXT | Text after the correction |
| `confidence_score` | INTEGER | How often this correction appears |
| `times_used` | INTEGER | Times this pattern was applied |
| `first_seen_at` | TIMESTAMP | When first discovered |
| `last_seen_at` | TIMESTAMP | Last time seen |

## Workflow

### Phase 1: Manual Editing (Current)

1. User edits transcript in UI
2. System generates diff between original and edited text
3. Store diff as `dictionary_corrections_applied` in new version
4. Extract patterns and store in `max_transcription_correction_patterns`

### Phase 2: Smart Suggestions (Future)

1. New transcription comes in
2. System scans for known patterns (`max_transcription_correction_patterns`)
3. Highlight potential corrections with confidence score
4. User can accept/reject suggestions
5. Accepted suggestions increment confidence score

### Phase 3: Auto-Correct (Future)

1. Confidence score threshold reached (e.g., 10+ confirmations)
2. System automatically applies correction to new transcriptions
3. User can review auto-corrections
4. Can revert if incorrect

## Implementation Steps

### Step 1: Add Edit Tracking to UI

```typescript
// When user saves edited transcript
const corrections = generateWordLevelDiff(originalText, editedText);
// Store in max_transcription_versions.dictionary_corrections_applied
```

### Step 2: Diff Generation Algorithm

```typescript
function generateWordLevelDiff(original: string, edited: string) {
  // Use a diff algorithm (e.g., diff.js, jsdiff)
  // Return array of corrections with positions
}
```

### Step 3: Pattern Extraction

```typescript
function extractPatterns(corrections: Correction[]) {
  // For each correction:
  // 1. Check if pattern exists in max_transcription_correction_patterns
  // 2. If exists, increment confidence_score and times_used
  // 3. If new, insert with confidence_score = 1
}
```

### Step 4: Suggestion Engine

```typescript
async function suggestCorrections(transcript: string) {
  // Query max_transcription_correction_patterns
  // For each known pattern, check if it appears in transcript
  // Return suggestions with confidence scores
}
```

## Benefits

1. **Time Savings:** Automated corrections for common errors
2. **Consistency:** Same errors always corrected the same way
3. **Learning:** System improves over time
4. **Audit Trail:** Complete history of all edits
5. **Translation Quality:** Better English = better translations

## Implementation Status

### Phase 1: Capture & Display ✅ Partially Complete
- ✅ Diff generation utility implemented
- ✅ API modified to capture edits
- ⏳ API endpoint to fetch corrections (pending)
- ⏳ Dashboard UI (pending)

### Future Enhancements

- **Context-aware corrections:** Same word corrected differently based on context
- **Domain-specific dictionaries:** Medical, dental, legal Buzz terms
- **User-specific patterns:** Learn individual editing preferences
- **Multi-language support:** Track corrections across languages
- **ML-based suggestions:** Use embeddings to find similar corrections

