import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { query, limit = 10, distance_threshold = 0.5 } = await request.json()

    if (!query) {
      return Response.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const openai = new OpenAI()
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })

    const queryEmbedding = response.data[0].embedding

    const { data: results, error } = await supabase.rpc('match_rag_content', {
      p_query_embedding: queryEmbedding,
      p_limit: limit,
      p_distance_threshold: distance_threshold,
    })

    if (error) {
      console.error('match_rag_content error:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    const sourceIds = Array.from(new Set((results || []).map((r: any) => r.source_id).filter(Boolean)))
    const sourceMeta: Record<string, { audioName: string | null; projectName: string | null }> = {}

    if (sourceIds.length > 0) {
      const { data: sources } = await supabase
        .from('max_transcriptions')
        .select(
          `
          id,
          audio:max_audio_files(
            file_name,
            display_name,
            project:max_projects(name)
          )
        `,
        )
        .in('id', sourceIds)

      sources?.forEach((item: any) => {
        const audio = Array.isArray(item.audio) ? item.audio[0] : item.audio
        const project = audio && Array.isArray(audio.project) ? audio.project[0] : audio?.project
        sourceMeta[item.id] = {
          audioName: audio?.display_name || audio?.file_name || null,
          projectName: project?.name || null,
        }
      })
    }

    const enrichedResults = (results || []).map((result: any) => {
      const meta = sourceMeta[result.source_id] || { audioName: null, projectName: null }
      return {
        chunk_id: result.segment_id,
        source_id: result.source_id,
        version_id: result.version_id,
        chunk_text: result.segment_text,
        start_timestamp: result.start_timestamp,
        end_timestamp: result.end_timestamp,
        distance: result.distance,
        audio_file_name: meta.audioName,
        project_name: meta.projectName,
      }
    })

    await supabase.from('user_queries').insert({
      user_id: user.id,
      query_text: query,
      query_embedding: queryEmbedding,
      total_results: enrichedResults.length,
      segments_returned: enrichedResults.map((res: RAGResult) => res.chunk_id),
    })

    return Response.json({
      success: true,
      data: enrichedResults,
    })
  } catch (error: any) {
    console.error('RAG search error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
