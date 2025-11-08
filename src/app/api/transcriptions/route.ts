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
    let ragStatusByVersion: Record<string, any> = {}
    let sourceStatusByTranscription: Record<string, any> = {}

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

        const versionIds = versions?.map(v => v.id).filter(Boolean)
        if (versionIds && versionIds.length > 0) {
          const { data: ragJobs, error: ragError } = await supabase
            .from('rag_ingestion_queue')
            .select('id, version_id, source_max_version_id, status, submitted_at, processed_at, result_summary')
            .in('source_max_version_id', versionIds)
            .order('submitted_at', { ascending: false })

          if (ragError) {
            console.error('Error fetching rag queue status:', ragError)
          } else {
            ragJobs?.forEach(job => {
              const key = job.source_max_version_id || job.version_id
              if (!key) return
              if (!ragStatusByVersion[key]) {
                ragStatusByVersion[key] = job
              }
            })
          }
        }
      }

      const { data: sources, error: sourcesError } = await supabase
        .from('content_sources')
        .select('id, transcription_status, rag_last_submitted_at, rag_processed_version_id')
        .in('id', transcriptionIds)

      if (sourcesError) {
        console.error('Error fetching content source status:', sourcesError)
      } else {
        sources?.forEach(source => {
          sourceStatusByTranscription[source.id] = source
        })
      }
    }

    // Attach versions to each transcription
    const transcriptionsWithVersions = transcriptions?.map(transcription => ({
      ...transcription,
      versions: (versionsByTranscription[transcription.id] || []).map(version => ({
        ...version,
        rag_status: ragStatusByVersion[version.id] || null,
      })),
      rag_source_status: sourceStatusByTranscription[transcription.id] || null,
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

