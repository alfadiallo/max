import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/transcriptions?audio_file_id=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const audioFileId = searchParams.get('audio_file_id')

    if (!audioFileId) {
      return NextResponse.json(
        { success: false, error: 'Missing audio_file_id' },
        { status: 400 }
      )
    }

    // Get transcriptions for this audio file
    const { data: transcriptions, error } = await supabase
      .from('max_transcriptions')
      .select('*')
      .eq('audio_file_id', audioFileId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get versions for each transcription
    const transcriptionIds = transcriptions?.map(t => t.id) || []
    
    let versionsByTranscription: Record<string, any[]> = {}
    if (transcriptionIds.length > 0) {
      const { data: versions, error: versionsError } = await supabase
        .from('max_transcription_versions')
        .select('*')
        .in('transcription_id', transcriptionIds)
        .order('version_number', { ascending: false })

      if (versionsError) {
        console.error('Error fetching versions:', versionsError)
      } else {
        versions?.forEach((version) => {
          if (!versionsByTranscription[version.transcription_id]) {
            versionsByTranscription[version.transcription_id] = []
          }
          versionsByTranscription[version.transcription_id].push(version)
        })
      }
    }

    // Attach versions to each transcription
    const transcriptionsWithVersions = transcriptions?.map(transcription => ({
      ...transcription,
      versions: versionsByTranscription[transcription.id] || []
    })) || []

    return NextResponse.json({
      success: true,
      data: transcriptionsWithVersions
    })

  } catch (error: any) {
    console.error('Transcription fetch error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch transcriptions' },
      { status: 500 }
    )
  }
}

