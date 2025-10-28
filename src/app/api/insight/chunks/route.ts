import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptionId = searchParams.get('transcriptionId')

    if (!transcriptionId) {
      return Response.json({ success: false, error: 'transcriptionId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get the insight transcript
    const { data: insightTranscript } = await supabase
      .from('insight_transcripts')
      .select('id')
      .eq('transcription_id', transcriptionId)
      .single()

    if (!insightTranscript) {
      return Response.json({ success: false, error: 'Insight transcript not found' }, { status: 404 })
    }

    // Get chunks for this transcript
    const { data: chunks, error: chunksError } = await supabase
      .from('insight_chunks')
      .select('*')
      .eq('insight_transcript_id', insightTranscript.id)
      .order('chunk_number', { ascending: true })

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError)
      return Response.json({ success: false, error: chunksError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: chunks || []
    })

  } catch (error: any) {
    console.error('Error in chunks list:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

