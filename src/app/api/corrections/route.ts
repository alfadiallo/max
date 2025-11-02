import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query params for filtering
    const { searchParams } = new URL(req.url)
    const audioFileId = searchParams.get('audio_file_id')

    // Build query to fetch transcription versions with their corrections
    let query = supabase
      .from('max_transcription_versions')
      .select(`
        id,
        transcription_id,
        version_number,
        version_type,
        edited_text,
        dictionary_corrections_applied,
        created_at,
        edited_by,
        transcription:max_transcriptions!max_transcription_versions_transcription_id_fkey!inner(
          id,
          audio_file_id,
          raw_text,
          final_version_id,
          audio:max_audio_files!inner(
            id,
            file_name,
            display_name,
            project:max_projects(
              id,
              name
            )
          )
        )
      `)
      .neq('dictionary_corrections_applied', null) // Only get versions with edits
      .order('created_at', { ascending: false })

    // Filter by audio file if provided
    if (audioFileId) {
      query = query.eq('transcription.audio_file_id', audioFileId)
    }

    // Only get transcriptions for user's projects
    query = query.eq('transcription.audio.project.created_by', user.id)

    const { data: versions, error } = await query

    if (error) throw error

    // Transform data to make it easier to display
    const corrections = versions?.flatMap(version => {
      if (!version.dictionary_corrections_applied || !Array.isArray(version.dictionary_corrections_applied)) {
        return []
      }

      // Unwrap nested relations that may be returned as arrays by PostgREST
      const transcriptionRel: any = Array.isArray((version as any).transcription)
        ? (version as any).transcription[0]
        : (version as any).transcription
      const audioRel: any = transcriptionRel?.audio
      const audioFile: any = Array.isArray(audioRel) ? audioRel[0] : audioRel
      const projectRel: any = audioFile?.project
      const project: any = Array.isArray(projectRel) ? projectRel[0] : projectRel
      const isFinal = transcriptionRel?.final_version_id === version.id
      
      return (version.dictionary_corrections_applied as any[]).map((edit, index) => ({
        id: `${version.id}-${index}`,
        version_id: version.id,
        transcription_id: version.transcription_id,
        version_type: version.version_type,
        version_number: version.version_number,
        is_final: isFinal,
        audio_file_id: audioFile?.id,
        audio_file_name: audioFile?.file_name,
        audio_display_name: audioFile?.display_name || audioFile?.file_name,
        project_name: project?.name,
        original_text: edit.original_text,
        corrected_text: edit.corrected_text,
        context_before: edit.context_before,
        context_after: edit.context_after,
        position_start: edit.position_start,
        position_end: edit.position_end,
        created_at: version.created_at
      }))
    }) || []

    return NextResponse.json({
      success: true,
      data: corrections,
      total: corrections.length
    })

  } catch (error: any) {
    console.error('Error fetching corrections:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch corrections' },
      { status: 500 }
    )
  }
}

