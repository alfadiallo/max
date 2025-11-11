#!/usr/bin/env tsx
/**
 * RAG Background Worker
 * 
 * A long-running background worker that processes RAG ingestion jobs without timeout constraints.
 * This worker polls the rag_ingestion_queue table and processes jobs independently of Edge Functions.
 * 
 * Usage:
 *   Development: npm run worker:rag
 *   Production: Deploy to Railway, Render, or Fly.io
 * 
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for database access
 *   OPENAI_API_KEY - OpenAI API key for embeddings
 *   ANTHROPIC_API_KEY - (Optional) Anthropic API key for Claude analysis
 *   RAG_ENABLE_CLAUDE_ANALYSIS - (Optional) Enable Claude analysis (default: false)
 *   RAG_POLL_INTERVAL_MS - (Optional) Polling interval in ms (default: 10000)
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const ENABLE_CLAUDE_ANALYSIS = process.env.RAG_ENABLE_CLAUDE_ANALYSIS === 'true'
const POLL_INTERVAL_MS = Number(process.env.RAG_POLL_INTERVAL_MS || '10000')
const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small'
const EMBEDDING_CHAR_LIMIT = Number(process.env.RAG_EMBEDDING_CHAR_LIMIT || '1200')
const EMBEDDING_BATCH_SIZE = Number(process.env.RAG_EMBEDDING_BATCH) || 16
const CLAUDE_CONCURRENCY = Number(process.env.RAG_CLAUDE_CONCURRENCY || '3')

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!OPENAI_API_KEY) {
  console.error('❌ Missing required environment variable: OPENAI_API_KEY')
  process.exit(1)
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

console.log('🚀 RAG Background Worker starting...')
console.log('📋 Configuration:', {
  supabaseUrl: SUPABASE_URL,
  embeddingModel: EMBEDDING_MODEL,
  embeddingCharLimit: EMBEDDING_CHAR_LIMIT,
  claudeAnalysis: ENABLE_CLAUDE_ANALYSIS ? 'enabled' : 'disabled',
  pollInterval: `${POLL_INTERVAL_MS}ms`,
})

// Types
interface QueueJob {
  id: string
  source_id: string | null
  version_id: string
  submitted_by: string | null
  submitted_at: string
  status: string
  result_summary: Record<string, any> | null
  error_detail: string | null
}

interface TranscriptVersion {
  id: string
  source_id: string
  version_label: string
  transcript_text: string
  metadata_json: Record<string, any> | null
}

interface TranscriptSegment {
  id: string
  version_id: string
  sequence_number: number
  text: string
  start_time: string | null
  end_time: string | null
}

// Helper: Chunk text for embedding
function chunkText(text: string, limit: number = EMBEDDING_CHAR_LIMIT): string[] {
  const cleaned = text?.trim()
  if (!cleaned) return []
  if (cleaned.length <= limit) return [cleaned]

  const chunks: string[] = []
  let remaining = cleaned

  while (remaining.length > limit) {
    let cutIndex = remaining.lastIndexOf(' ', limit)
    if (cutIndex < limit * 0.6) {
      cutIndex = limit
    }
    const chunk = remaining.slice(0, cutIndex).trim()
    if (chunk.length > 0) {
      chunks.push(chunk)
    }
    remaining = remaining.slice(cutIndex).trim()
  }

  if (remaining.length > 0) {
    chunks.push(remaining)
  }

  return chunks
}

// Helper: Average vectors
function averageVectors(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null
  const dim = vectors[0].length
  const sum = new Array(dim).fill(0)
  
  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      sum[i] += vec[i]
    }
  }
  
  return sum.map(val => val / vectors.length)
}

// Process a single job
async function processJob(job: QueueJob): Promise<void> {
  const startTime = Date.now()
  console.log(`\n📦 Processing job ${job.id}`)

  try {
    // Mark as processing
    await supabase
      .from('rag_ingestion_queue')
      .update({
        status: 'processing',
        result_summary: {
          notes: 'Worker started processing',
          started_at: new Date().toISOString(),
        },
      })
      .eq('id', job.id)

    // Fetch version and segments
    const { data: version, error: versionError } = await supabase
      .from('transcript_versions')
      .select('*')
      .eq('id', job.version_id)
      .single()

    if (versionError || !version) {
      throw new Error(`Failed to fetch version: ${versionError?.message}`)
    }

    const { data: segments, error: segmentsError } = await supabase
      .from('transcript_segments')
      .select('*')
      .eq('version_id', job.version_id)
      .order('sequence_number', { ascending: true })

    if (segmentsError || !segments) {
      throw new Error(`Failed to fetch segments: ${segmentsError?.message}`)
    }

    console.log(`  📄 Version: ${version.version_label}`)
    console.log(`  📊 Segments: ${segments.length}`)

    // Process each segment
    let embeddingsCreated = 0
    let embeddingChunksGenerated = 0

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      const progress = `${i + 1}/${segments.length}`
      
      console.log(`  🔄 Processing segment ${progress} (seq: ${segment.sequence_number})`)

      // Generate embedding
      const chunks = chunkText(segment.text)
      if (chunks.length === 0) {
        console.warn(`    ⚠️  Segment ${segment.sequence_number} produced no chunks`)
        continue
      }

      const chunkVectors: number[][] = []
      
      for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE)
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch,
        })
        
        response.data.forEach((item) => {
          embeddingChunksGenerated++
          chunkVectors.push(item.embedding)
        })
      }

      const averaged = averageVectors(chunkVectors)
      if (!averaged) {
        console.warn(`    ⚠️  Failed to average vectors for segment ${segment.sequence_number}`)
        continue
      }

      // Insert into content_segments
      const { error: insertError } = await supabase
        .from('content_segments')
        .upsert({
          source_id: version.source_id,
          version_id: version.id,
          segment_text: segment.text,
          sequence_number: segment.sequence_number,
          start_timestamp: segment.start_time,
          end_timestamp: segment.end_time,
          embedding: averaged,
          metadata: {
            transcript_version_id: version.id,
            transcript_segment_id: segment.id,
          },
        }, {
          onConflict: 'version_id,sequence_number',
        })

      if (insertError) {
        console.error(`    ❌ Failed to insert segment ${segment.sequence_number}:`, insertError)
        continue
      }

      embeddingsCreated++

      // Update progress
      await supabase
        .from('rag_ingestion_queue')
        .update({
          result_summary: {
            notes: `Processing… ${progress} segments`,
            segments_processed: i + 1,
            segments_total: segments.length,
            embeddings_created: embeddingsCreated,
            embedding_chunks: embeddingChunksGenerated,
            embedding_model: EMBEDDING_MODEL,
          },
        })
        .eq('id', job.id)

      console.log(`    ✅ Segment ${segment.sequence_number} embedded (${chunks.length} chunks)`)
    }

    // Mark as complete
    const duration = Date.now() - startTime
    await supabase
      .from('rag_ingestion_queue')
      .update({
        status: 'complete',
        processed_at: new Date().toISOString(),
        result_summary: {
          notes: ENABLE_CLAUDE_ANALYSIS
            ? 'Embeddings generated. Claude analysis not yet implemented.'
            : 'Embeddings generated without Claude analysis.',
          segments_processed: segments.length,
          segments_total: segments.length,
          embeddings_created: embeddingsCreated,
          embedding_chunks: embeddingChunksGenerated,
          embedding_model: EMBEDDING_MODEL,
          duration_ms: duration,
          processed_version_id: job.version_id,
        },
      })
      .eq('id', job.id)

    // Update content source
    await supabase
      .from('content_sources')
      .update({
        rag_processed_version_id: job.version_id,
        transcription_status: 'ingested',
      })
      .eq('id', version.source_id)

    console.log(`✅ Job ${job.id} completed in ${(duration / 1000).toFixed(1)}s`)
  } catch (error: any) {
    console.error(`❌ Job ${job.id} failed:`, error)
    
    await supabase
      .from('rag_ingestion_queue')
      .update({
        status: 'error',
        error_detail: error.message || String(error),
      })
      .eq('id', job.id)
  }
}

// Main polling loop
async function pollQueue() {
  try {
    // Fetch queued jobs
    const { data: jobs, error } = await supabase
      .from('rag_ingestion_queue')
      .select('*')
      .eq('status', 'queued')
      .order('submitted_at', { ascending: true })
      .limit(1)

    if (error) {
      console.error('❌ Failed to fetch queue:', error)
      return
    }

    if (!jobs || jobs.length === 0) {
      // No jobs to process
      return
    }

    // Process the first job
    await processJob(jobs[0])
  } catch (error) {
    console.error('❌ Polling error:', error)
  }
}

// Start the worker
async function start() {
  console.log('✅ Worker ready. Polling for jobs...\n')

  // Poll immediately
  await pollQueue()

  // Then poll at intervals
  setInterval(pollQueue, POLL_INTERVAL_MS)
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down worker...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down worker...')
  process.exit(0)
})

// Start the worker
start().catch((error) => {
  console.error('❌ Worker failed to start:', error)
  process.exit(1)
})

