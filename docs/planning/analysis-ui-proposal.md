# Analysis UI/UX Proposal

## Overview
After transcription editing is complete, we analyze the content with Claude to extract metadata for better organization and future analytics.

## UI Structure: Tabbed Interface

### Tab 1: **Transcription** (Current View)
- Shows T-1, H-1, H-2, H-3... in collapsible sections
- Latest version on top, expanded
- Edit button only on latest version
- "View Transcription" button to expand/collapse

### Tab 2: **Final** (New)
- Shows the "promoted to final" version
- Has "Send for Analysis" button
- After analysis, shows the metadata extracted
- Read-only once marked as final

### Tab 3: **Analysis** (New)
- Displays Claude's analysis results
- Shows:
  - Content Type badge
  - Thematic Tags (as chips/badges)
  - Key Concepts (bulleted list)
  - Target Audience
  - Tone & Style
  - Summary (expandable)
- Edit tags/concepts if needed

## Flow

1. **User edits transcription** → Creates H-1, H-2, H-3...
2. **User clicks "Promote to Final"** in Transcription tab
   - Moves to Final tab
   - Becomes read-only
3. **User clicks "Send for Analysis"** in Final tab
   - Calls Claude API
   - Stores metadata in `max_transcription_analyses`
   - Shows results in Analysis tab
4. **User can edit analysis metadata** if wrong
5. **Future: Analytics dashboard** uses this metadata

## Database Flow

```
max_transcriptions (T-1)
└── max_transcription_versions (H-1, H-2, H-3...)
    └── max_transcription_analyses (Claude's output) ← NEW
```

## API Endpoints Needed

1. **POST /api/transcriptions/[id]/promote-to-final**
   - Marks a version as "final"
   - Stores in `transcription_version_id` field

2. **POST /api/transcriptions/[id]/analyze**
   - Calls Claude with analysis prompt
   - Returns structured metadata
   - Saves to `max_transcription_analyses` table

3. **GET /api/transcriptions/[id]/analysis**
   - Retrieves existing analysis
   - Returns metadata object

4. **PATCH /api/analyses/[id]**
   - Allows manual editing of analysis tags/concepts

## Component Structure

```
TranscriptionTabs (main container with tabs)
├── TranscriptionTab (current view)
├── FinalTab (new)
│   ├── FinalTranscriptionView
│   └── SendForAnalysisButton
└── AnalysisTab (new)
    ├── AnalysisResultsDisplay
    │   ├── ContentTypeBadge
    │   ├── TagChips
    │   ├── KeyConceptsList
    │   └── Summary
    └── EditAnalysisButton
```

## Claude Prompt Location

**File**: `src/lib/prompts/transcription-analysis.ts`
- Contains system prompt
- Contains user prompt template
- TypeScript types for structured output

## Benefits

1. **Better Organization**: Metadata helps categorize content
2. **Analytics Ready**: Can query all transcriptions by theme/concept
3. **Search Enhancement**: Future search can use these tags
4. **Content Discovery**: "Similar content" recommendations
5. **Quality Control**: Review what content types are being created

## Implementation Order

1. ✅ Create analysis prompt file
2. ✅ Create analysis database table
3. ⏳ Create API route for Claude analysis
4. ⏳ Update TranscriptionView to tabs
5. ⏳ Create FinalTab component
6. ⏳ Create AnalysisTab component
7. ⏳ Add "Send for Analysis" button
8. ⏳ Display analysis results with badges/tags


