import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { transcriptionId } = await request.json()

    if (!transcriptionId) {
      return Response.json({ success: false, error: 'transcription_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user for auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if chunks already exist for this transcription
    const { data: insightTranscript } = await supabase
      .from('insight_transcripts')
      .select('id')
      .eq('transcription_id', transcriptionId)
      .single()

    if (!insightTranscript) {
      return Response.json({ 
        success: false, 
        error: 'Transcript must be sent to Insight first. Please use "Send to Insight" button.' 
      }, { status: 400 })
    }

    const { data: existingChunks } = await supabase
      .from('insight_chunks')
      .select('id')
      .eq('insight_transcript_id', insightTranscript.id)
      .limit(1)

    // Check if already indexed
    if (existingChunks && existingChunks.length > 0) {
      return Response.json({ 
        success: false, 
        error: 'This transcript has already been indexed for RAG',
        data: { 
          message: 'Chunks already exist. Content is searchable via RAG.' 
        }
      }, { status: 400 })
    }

    // Call the chunking endpoint
    const chunkResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/insight/chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcriptionId })
    })

    const chunkResult = await chunkResponse.json()

    if (!chunkResult.success) {
      return Response.json({ 
        success: false, 
        error: `Indexing failed: ${chunkResult.error}` 
      }, { status: 500 })
    }

    return Response.json({
      success: true,
      message: `✅ Transcript indexed for RAG with ${chunkResult.data.chunkCount} chunks`,
      data: chunkResult.data
    })

  } catch (error: any) {
    console.error('Error sending to RAG:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

