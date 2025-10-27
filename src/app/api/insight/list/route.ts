import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get all Insight transcripts for this user
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('insight_transcripts')
      .select(`
        id,
        transcription_id,
        text,
        status,
        created_at,
        metadata:insight_metadata(*),
        tags:insight_tags(*)
      `)
      .order('created_at', { ascending: false })

    if (transcriptsError) {
      console.error('Error fetching transcripts:', transcriptsError)
      return Response.json({ success: false, error: transcriptsError.message }, { status: 500 })
    }

    // Filter to only transcripts the user owns
    const userTranscripts = []

    for (const transcript of transcripts || []) {
      // Check if user owns this transcription
      const { data: transcription } = await supabase
        .from('max_transcriptions')
        .select(`
          audio_file_id,
          audio:max_audio_files!inner(
            project_id,
            project:max_projects!inner(created_by)
          )
        `)
        .eq('id', transcript.transcription_id)
        .single()

      if (transcription?.audio?.project?.created_by === user.id) {
        userTranscripts.push(transcript)
      }
    }

    return Response.json({
      success: true,
      data: userTranscripts
    })

  } catch (error: any) {
    console.error('Error in list:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}
