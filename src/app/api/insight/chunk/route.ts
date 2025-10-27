import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { transcriptionId } = await request.json()

    if (!transcriptionId) {
      return Response.json({ success: false, error: 'transcription_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the Insight transcript
    const { data: insightTranscript, error: transcriptError } = await supabase
      .from('insight_transcripts')
      .select('id, text, json_with_timestamps')
      .eq('transcription_id', transcriptionId)
      .single()

    if (transcriptError || !insightTranscript) {
      return Response.json({ success: false, error: 'Insight transcript not found' }, { status: 404 })
    }

    // Get the metadata to use for semantic boundaries
    const { data: metadata } = await supabase
      .from('insight_metadata')
      .select('procedures_discussed, key_concepts, learning_objectives')
      .eq('insight_transcript_id', insightTranscript.id)
      .single()

    // Parse the segments from json_with_timestamps
    const segments = insightTranscript.json_with_timestamps?.segments || []
    if (segments.length === 0) {
      return Response.json({ success: false, error: 'No segments found' }, { status: 400 })
    }

    // Chunking algorithm: Three-layer approach
    // Layer 1: Identify semantic boundaries (topic shifts)
    // Layer 2: Split into 500-800 token chunks with overlap
    // Layer 3: Add metadata enrichment

    const chunks: any[] = []
    let currentChunk: any = null
    let tokenCount = 0
    const targetChunkSize = 700 // tokens
    const overlapSize = 100 // tokens

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const segmentText = segment.text
      
      // Estimate tokens (rough: 1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil(segmentText.length / 4)
      
      // Check for semantic boundary (topic shift)
      const isBoundary = detectSemanticBoundary(segment, i, segments)

      // Start new chunk if boundary detected or target size reached
      if ((currentChunk && (tokenCount + estimatedTokens > targetChunkSize || isBoundary)) || !currentChunk) {
        // Save previous chunk if exists
        if (currentChunk) {
          chunks.push(currentChunk)
        }

        // Create new chunk
        currentChunk = {
          chunk_number: chunks.length,
          timestamp_start: formatTime(segment.start),
          timestamp_start_seconds: segment.start,
          text: segmentText,
          segments_included: [i],
          token_count: estimatedTokens
        }
        tokenCount = estimatedTokens
      } else {
        // Add to current chunk
        currentChunk.text += ' ' + segmentText
        currentChunk.segments_included.push(i)
        currentChunk.timestamp_end = formatTime(segment.end)
        currentChunk.timestamp_end_seconds = segment.end
        currentChunk.token_count += estimatedTokens
        tokenCount += estimatedTokens
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push(currentChunk)
    }

    // Update pipeline status
    await supabase
      .from('insight_pipeline_status')
      .update({
        current_stage: 'chunking',
        chunking_started_at: new Date().toISOString()
      })
      .eq('transcription_id', transcriptionId)

    // Generate embeddings for each chunk
    const openai = new OpenAI()
    const embeddedChunks = []

    for (const chunk of chunks) {
      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk.text
        })

        const embedding = response.data[0].embedding

        // Enrich chunk with metadata
        const enrichedChunk = {
          ...chunk,
          procedures_mentioned: extractMentions(chunk.text, metadata?.procedures_discussed || []),
          tools_mentioned: extractMentions(chunk.text, metadata?.products_or_tools || []),
          concepts_mentioned: extractMentions(chunk.text, metadata?.key_concepts || []),
          semantic_section: inferSectionTitle(chunk),
          embedding: embedding
        }

        embeddedChunks.push(enrichedChunk)
      } catch (embedError) {
        console.error('Error generating embedding:', embedError)
        // Continue with other chunks
      }
    }

    // Store chunks in database
    // Note: We'll create a separate chunks table insert endpoint

    // Update pipeline status
    await supabase
      .from('insight_pipeline_status')
      .update({
        current_stage: 'complete',
        status: 'complete',
        chunking_completed_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('transcription_id', transcriptionId)

    return Response.json({
      success: true,
      message: `Chunking complete. Generated ${chunks.length} chunks.`,
      data: {
        chunkCount: chunks.length,
        chunks: embeddedChunks.map(c => ({
          chunk_number: c.chunk_number,
          text: c.text.substring(0, 200) + '...',
          timestamp_start: c.timestamp_start,
          timestamp_end: c.timestamp_end,
          token_count: c.token_count
        }))
      }
    })

  } catch (error: any) {
    console.error('Error in chunking:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

// Helper: Detect semantic boundaries (topic shifts)
function detectSemanticBoundary(segment: any, index: number, allSegments: any[]): boolean {
  // Check for topic transition markers
  const transitionMarkers = [
    'now let\'s', 'next we\'ll', 'moving on', 'let\'s discuss', 'another important',
    'case study', 'example', 'in this case', 'summary', 'conclusion'
  ]

  const segmentLower = segment.text.toLowerCase()
  
  // Check if this segment starts with a transition marker
  for (const marker of transitionMarkers) {
    if (segmentLower.startsWith(marker) || segmentLower.includes(` ${marker} `)) {
      return true
    }
  }

  // Check for significant time gap (>30 seconds) = likely new section
  if (index > 0) {
    const prevSegment = allSegments[index - 1]
    const timeGap = segment.start - prevSegment.end
    if (timeGap > 30) {
      return true
    }
  }

  return false
}

// Helper: Extract mentions from text
function extractMentions(text: string, keywords: string[]): string[] {
  const textLower = text.toLowerCase()
  return keywords.filter(keyword => {
    const keywordLower = keyword.toLowerCase().replace(/_/g, ' ')
    return textLower.includes(keywordLower)
  })
}

// Helper: Infer section title from chunk content
function inferSectionTitle(chunk: any): string {
  const firstSentence = chunk.text.split('.')[0]
  // Take first 50 chars or up to first sentence
  return firstSentence.substring(0, 50).trim()
}

// Helper: Format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
