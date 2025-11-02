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
        metadata:insight_metadata(*)
      `)
      .order('created_at', { ascending: false })

    if (transcriptsError) {
      console.error('Error fetching transcripts:', transcriptsError)
      return Response.json({ success: false, error: transcriptsError.message }, { status: 500 })
    }

    // Filter to only transcripts the user owns and enrich with project/audio names
    const userTranscripts = []

    for (const transcript of transcripts || []) {
      // Check if user owns this transcription and get project/audio info
      const { data: transcription } = await supabase
        .from('max_transcriptions')
        .select(`
          audio_file_id,
          audio:max_audio_files!inner(
            file_name,
            project_id,
            project:max_projects!inner(
              name,
              created_by
            )
          )
        `)
        .eq('id', transcript.transcription_id)
        .single()

      const audio: any = Array.isArray(transcription?.audio) ? transcription?.audio[0] : transcription?.audio
      const project: any = Array.isArray(audio?.project) ? audio?.project[0] : audio?.project
      if (project?.created_by === user.id) {
        // Get metadata separately (join returns array but should be one-to-one)
        const metadata = Array.isArray(transcript.metadata) && transcript.metadata.length > 0 
          ? transcript.metadata[0] 
          : null
        
        // Enrich transcript with display names
        userTranscripts.push({
          ...transcript,
          metadata,
          project_name: project?.name,
          audio_file_name: audio?.file_name
        })
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
