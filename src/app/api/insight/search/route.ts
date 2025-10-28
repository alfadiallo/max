import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!query) {
    return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Search for exact text matches in chunk text
    const { data: allChunks, error: chunksError } = await supabase
      .from('insight_chunks')
      .select(`
        id,
        insight_transcript_id,
        text,
        timestamp_start,
        timestamp_end,
        timestamp_start_seconds,
        timestamp_end_seconds,
        duration_seconds,
        procedures_mentioned,
        tools_mentioned,
        concepts_mentioned,
        semantic_section
      `)
      .ilike('text', `%${query}%`)
      .limit(limit)

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError)
      return NextResponse.json({ success: false, error: chunksError.message }, { status: 500 })
    }

    // Enrich chunks with transcription/audio/project info
    const enrichedChunks = []
    for (const chunk of allChunks || []) {
      // Get insight transcript
      const { data: insightTranscript } = await supabase
        .from('insight_transcripts')
        .select('transcription_id')
        .eq('id', chunk.insight_transcript_id)
        .single()

      if (!insightTranscript) continue

      // Get transcription and audio/project info
      const { data: transcription } = await supabase
        .from('max_transcriptions')
        .select(`
          audio:max_audio_files!inner(
            file_name,
            project:max_projects!inner(
              name,
              created_by
            )
          )
        `)
        .eq('id', insightTranscript.transcription_id)
        .single()

      // Only include chunks from user's own projects
      if (transcription?.audio?.project?.created_by === user.id) {
        enrichedChunks.push({
          ...chunk,
          insight_transcripts: {
            transcription_id: insightTranscript.transcription_id,
            transcription: {
              audio: {
                file_name: transcription.audio.file_name,
                project: {
                  name: transcription.audio.project.name
                }
              }
            }
          }
        })
      }
    }

    return NextResponse.json({ success: true, data: enrichedChunks })
  } catch (error: any) {
    console.error('Error in search:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

