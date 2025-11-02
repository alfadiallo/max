import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { query, limit = 10, distance_threshold = 0.5 } = await request.json()

    if (!query) {
      return Response.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get user for auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Generate embedding for query using OpenAI
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

    // Enrich results with transcript, audio, and project info
    const enrichedResults = await Promise.all((results || []).map(async (result: any) => {
      // Get transcript info
      const { data: transcript } = await supabase
        .from('insight_transcripts')
        .select('transcription_id')
        .eq('id', result.insight_transcript_id)
        .single()

      let audioFileName = null
      let projectName = null

      if (transcript) {
        // Get audio file info through max_transcriptions
        const { data: transcription } = await supabase
          .from('max_transcriptions')
          .select(`
            audio_file_id,
            audio:max_audio_files(
              file_name,
              display_name,
              project:max_projects(name)
            )
          `)
          .eq('id', transcript.transcription_id)
          .single()

        if (transcription?.audio) {
          const audio: any = Array.isArray(transcription.audio) ? transcription.audio[0] : transcription.audio
          const project: any = Array.isArray(audio?.project) ? audio?.project[0] : audio?.project
          audioFileName = audio?.display_name || audio?.file_name
          projectName = project?.name || null
        }
      }

      return {
        ...result,
        audio_file_name: audioFileName,
        project_name: projectName
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

