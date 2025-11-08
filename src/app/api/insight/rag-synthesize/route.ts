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

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: segments, error: chunksError } = await supabase
      .from('content_segments')
      .select(
        `
        id,
        source_id,
        version_id,
        segment_text,
        start_timestamp,
        end_timestamp,
        sequence_number,
        created_at,
        content_sources (
          title,
          metadata
        ),
        transcript_versions (
          version_label
        )
      `,
      )
      .in('id', chunk_ids)

    if (chunksError) {
      return Response.json({ success: false, error: chunksError.message }, { status: 500 })
    }

    if (!segments || segments.length === 0) {
      return Response.json({ success: false, error: 'No segments found' }, { status: 404 })
    }

    const contextText = segments
      .map((segment: any, idx: number) => {
        const start = segment.start_timestamp ?? 'unknown'
        const end = segment.end_timestamp ?? 'unknown'
        return `[Chunk ${idx + 1}, ${start}-${end}]:\n${segment.segment_text}`
      })
      .join('\n\n')

    const anthropic = new Anthropic()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Based on these transcript excerpts, answer the following question:\n\n${query}\n\nContext:\n${contextText}\n\nProvide a clear answer with timestamp references where relevant.`,
        },
      ],
    })

    return Response.json({
      success: true,
      data: {
        answer: message.content[0].type === 'text' ? message.content[0].text : '',
        sources: segments.map((segment: any) => ({
          chunk_id: segment.id,
          timestamp_start: segment.start_timestamp,
          timestamp_end: segment.end_timestamp,
          source_id: segment.source_id,
          version_id: segment.version_id,
          version_label: segment.transcript_versions?.version_label ?? null,
          sequence_number: segment.sequence_number,
          title: segment.content_sources?.title ?? null,
          metadata: segment.content_sources?.metadata ?? null,
        })),
      },
    })
  } catch (error: any) {
    console.error('RAG synthesis error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
