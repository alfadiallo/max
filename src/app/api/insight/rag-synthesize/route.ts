import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const { query, chunk_ids } = await request.json()

    if (!query) {
      return Response.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    if (!chunk_ids || !Array.isArray(chunk_ids) || chunk_ids.length === 0) {
      return Response.json({ success: false, error: 'chunk_ids array is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get user for auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('insight_chunks')
      .select('*')
      .in('id', chunk_ids)

    if (chunksError) {
      return Response.json({ success: false, error: chunksError.message }, { status: 500 })
    }

    if (!chunks || chunks.length === 0) {
      return Response.json({ success: false, error: 'No chunks found' }, { status: 404 })
    }

    // Format chunks for Claude
    const contextText = chunks.map((chunk: any, idx: number) => {
      const markers = chunk.segment_markers && Array.isArray(chunk.segment_markers) 
        ? chunk.segment_markers.join(', ') 
        : chunk.timestamp_start
      
      return `[Chunk ${idx + 1}, ${chunk.timestamp_start}-${chunk.timestamp_end}, markers: ${markers}]:\n${chunk.text}`
    }).join('\n\n')

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
    console.error('RAG synthesis error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}

