# RAG Implementation Checklist

## Phase 1: Database Migration (READY TO EXECUTE)

### ✅ Pre-Migration
- [x] Analysis complete (RAG_MIGRATION_ANALYSIS.md)
- [x] Compliance verified (RAG_PRD_COMPLIANCE_CHECK.md)
- [x] Migration script created (supabase-rag-extension-option-a.sql)
- [x] Testing checklist prepared (RAG_TESTING_CHECKLIST.md)

### 🔲 Migration Execution
- [ ] **YOUR ACTION:** Backup production database
- [ ] **YOUR ACTION:** Test migration on staging database
- [ ] **YOUR ACTION:** Verify migration success (see testing checklist)
- [ ] **YOUR ACTION:** Apply to production (after staging passes)

**Time Estimate:** 30 minutes - 1 hour  
**Risk:** Low (additive only)

---

## Phase 2: Update Chunking Service

### 🔧 Code Changes Required

**File:** `src/app/api/insight/chunk/route.ts`

#### Change 1: Fetch `source_final_version_id`
```typescript
// Line 16: Update SELECT to include source_final_version_id
.select('id, text, json_with_timestamps, source_final_version_id')
```

#### Change 2: Extract segment timestamps for `segment_markers`
```typescript
// Around line 82-99: Add segment markers to chunks
currentChunk = {
  chunk_number: chunks.length,
  timestamp_start: formatTime(seg.start),
  timestamp_start_seconds: seg.start,
  timestamp_end: formatTime(seg.end),
  timestamp_end_seconds: seg.end,
  text: seg.text,
  token_count: segmentTokens,
  segment_markers: []  // NEW: Will accumulate timestamps
}
```

#### Change 3: Accumulate segment markers as chunks are built
```typescript
// Modify the accumulation loop to track markers
for (let i = 0; i < accumulatedSegments.length; i++) {
  const seg = accumulatedSegments[i]
  const segmentTokens = seg.tokens
  
  if (isFirstSegment || (wouldExceed && currentChunkTokens >= minChunkSize)) {
    // Start new chunk
    currentChunk = {
      // ... existing fields
      segment_markers: []  // Reset for new chunk
    }
    currentChunk.segment_markers.push(formatTime(seg.start))  // Add first timestamp
  } else {
    // Add to current chunk
    currentChunk.segment_markers.push(formatTime(seg.start))  // Add each timestamp
  }
  
  // Always add end timestamp
  currentChunk.segment_markers.push(formatTime(seg.end))
}
```

#### Change 4: Include new fields in chunk inserts
```typescript
// Line 148: Update chunkInserts mapping
const chunkInserts = embeddedChunks.map(chunk => ({
  insight_transcript_id: insightTranscript.id,
  chunk_number: chunk.chunk_number,
  timestamp_start: chunk.timestamp_start,
  timestamp_start_seconds: Math.round(chunk.timestamp_start_seconds),
  timestamp_end: chunk.timestamp_end,
  timestamp_end_seconds: Math.round(chunk.timestamp_end_seconds),
  duration_seconds: Math.round(chunk.timestamp_end_seconds - chunk.timestamp_start_seconds),
  text: chunk.text,
  token_count: chunk.token_count,
  procedures_mentioned: chunk.procedures_mentioned || [],
  tools_mentioned: chunk.tools_mentioned || [],
  concepts_mentioned: chunk.concepts_mentioned || [],
  semantic_section: chunk.semantic_section,
  embedding: chunk.embedding,
  // NEW FIELDS:
  segment_markers: chunk.segment_markers,  // Array of timestamps
  final_version_reference_id: insightTranscript.source_final_version_id  // H-version UUID
}))
```

#### Change 5: Update tracking on `insight_transcripts`
```typescript
// After successful chunk insert (around line 174)
// Add this new section:

// Update insight_transcripts with indexing metadata
if (embeddedChunks.length > 0) {
  await supabase
    .from('insight_transcripts')
    .update({
      indexed_final_version_id: insightTranscript.source_final_version_id,
      indexed_at: new Date().toISOString(),
      indexed_by: user.id  // Need to get user from context
    })
    .eq('id', insightTranscript.id)
}
```

**Note:** Need to get `user` object from Supabase auth context

---

## Phase 3: Build RAG Search API

### 🔧 New Endpoint Required

**File:** `src/app/api/insight/rag-search/route.ts` (CREATE NEW FILE)

```typescript
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { query, limit = 10, distance_threshold = 0.5 } = await request.json()

    if (!query) {
      return Response.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Generate embedding for query
    const openai = new OpenAI()
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    })

    const queryEmbedding = response.data[0].embedding

    // Search using the database function
    const { data: results, error } = await supabase.rpc('search_insight_chunks', {
      p_query_embedding: queryEmbedding,
      p_limit: limit,
      p_distance_threshold: distance_threshold
    })

    if (error) {
      console.error('Search error:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    // Enrich results with transcript info
    const enrichedResults = await Promise.all(results.map(async (result: any) => {
      // Get transcript info
      const { data: transcript } = await supabase
        .from('insight_transcripts')
        .select('transcription_id')
        .eq('id', result.insight_transcript_id)
        .single()

      // Get audio file info
      if (transcript) {
        const { data: audioFile } = await supabase
          .from('max_audio_files')
          .select('file_name, display_name, project:max_projects(name)')
          .eq('id', transcript.transcription_id)  // Need to join through max_transcriptions
          .single()
          
        // ... more joins needed
      }

      return {
        ...result,
        audio_file_name: audioFile?.display_name || audioFile?.file_name,
        project_name: audioFile?.project?.name
      }
    }))

    return Response.json({
      success: true,
      data: enrichedResults
    })

  } catch (error: any) {
    console.error('RAG search error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

**Estimated Time:** 4-5 hours

---

## Phase 4: Integrate Claude for Synthesis

### 🔧 New Endpoint Required

**File:** `src/app/api/insight/rag-synthesize/route.ts` (CREATE NEW FILE)

```typescript
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const { query, chunk_ids } = await request.json()

    // Fetch chunks
    const supabase = await createClient()
    const { data: chunks } = await supabase
      .from('insight_chunks')
      .select('*')
      .in('id', chunk_ids)

    // Format chunks for Claude
    const contextText = chunks.map((chunk: any, idx: number) => 
      `[Chunk ${idx + 1}, ${chunk.timestamp_start}-${chunk.timestamp_end}]:\n${chunk.text}`
    ).join('\n\n')

    // Call Claude
    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Based on these transcript excerpts, answer the following question:\n\n${query}\n\nContext:\n${contextText}\n\nProvide a clear answer with timestamp references where relevant.`
      }]
    })

    return Response.json({
      success: true,
      data: {
        answer: message.content[0].type === 'text' ? message.content[0].text : '',
        sources: chunks.map((c: any) => ({
          chunk_id: c.id,
          timestamp_start: c.timestamp_start,
          timestamp_end: c.timestamp_end,
          segment_markers: c.segment_markers
        }))
      }
    })

  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

**Estimated Time:** 2-3 hours

---

## Phase 5: Build Search UI

### 🔧 Frontend Changes

**File:** `src/app/insight/search/` - Already exists, needs enhancement

**Additions needed:**
1. Query input
2. Semantic search button
3. Display results with:
   - Chunk text
   - Timestamps (clickable)
   - Relevance score
   - Video jump links
4. "Ask Claude" button for synthesis
5. Display Claude answer

**Estimated Time:** 3-4 hours

---

## What I Need From You

### 1. **Database Access** 🔑
- [ ] Access to staging Supabase database
- [ ] Permission to run migrations
- [ ] Access to production (after staging passes)

### 2. **Approval to Proceed** ✅
- [ ] Approve Phase 1 migration (read-only, no risk)
- [ ] Approve Phase 2 code changes
- [ ] Approve Phase 3-5 new features

### 3. **Testing Data** 🧪
- [ ] Identify 2-3 sample transcripts for testing
- [ ] Confirm transcripts have been chunked
- [ ] Provide sample queries you'd like tested

### 4. **Access & Keys** 🔐
- [ ] Confirm OpenAI API key is configured
- [ ] Confirm Anthropic API key is configured
- [ ] Confirm Supabase credentials are in `.env`

---

## Implementation Order

### Step 1: Database Migration (30 min)
**You execute:** Run migration script on staging

### Step 2: Code Updates (2-3 days)
**I implement:**
- Update chunking service
- Build search API
- Build synthesis API
- Enhance search UI

### Step 3: Testing (1 day)
**We test together:**
- Run migration on production
- Test with real transcripts
- Verify search results
- Test Claude synthesis

### Step 4: Launch 🚀
**Deploy to production**

---

## Questions for You

1. **Do you have a staging database?** Or should we test on production?
2. **What transcripts should we use for testing?** (File names or IDs)
3. **Do you want me to proceed with ALL phases?** Or just Phase 1 first?
4. **Any specific requirements for the search UI?** Look and feel preferences?
5. **When do you want this deployed?** Any deadline?

---

## Current Status

✅ **Ready to start:** All documentation complete, migration script ready  
⏳ **Waiting on:** Your approval to proceed  
🎯 **Next step:** Execute Phase 1 migration on staging

