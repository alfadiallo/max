import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { segmentsToCompleteText } from '@/lib/utils/transcriptionFormat'

// GET /api/transcriptions/[id]/versions - Get all versions for a transcription
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const transcriptionId = params.id

    // Get the original transcription
    const { data: transcription, error: transError } = await supabase
      .from('max_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single()

    if (transError || !transcription) {
      return NextResponse.json(
        { success: false, error: 'Transcription not found' },
        { status: 404 }
      )
    }

    // Get all versions with their json_with_timestamps
    const { data: versions, error: versionsError } = await supabase
      .from('max_transcription_versions')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .order('version_number', { ascending: true })

    if (versionsError) throw versionsError

    // Combine original T-1 with versions
    return NextResponse.json({
      success: true,
      data: {
        transcription,
        versions: versions || []
      }
    })

  } catch (error: any) {
    console.error('Get versions error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

// POST /api/transcriptions/[id]/versions - Create a new version
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const transcriptionId = params.id
    const body = await req.json()
    const { edited_text, json_with_timestamps, actual_edits } = body

    // If only timestamped JSON provided, generate complete text from it
    let finalEditedText = edited_text
    let finalJsonWithTimestamps = json_with_timestamps
    
    if (!finalEditedText && finalJsonWithTimestamps) {
      // Extract complete text from timestamped segments
      const segments = finalJsonWithTimestamps.segments || []
      finalEditedText = segmentsToCompleteText(segments)
    }

    if (!finalEditedText && !finalJsonWithTimestamps) {
      return NextResponse.json(
        { success: false, error: 'Missing edited_text or json_with_timestamps' },
        { status: 400 }
      )
    }

    // Get the transcription
    const { data: transcription, error: transError } = await supabase
      .from('max_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single()

    if (transError || !transcription) {
      return NextResponse.json(
        { success: false, error: 'Transcription not found' },
        { status: 404 }
      )
    }

    // Get the latest version number
    const { data: latestVersion, error: latestError } = await supabase
      .from('max_transcription_versions')
      .select('version_number')
      .eq('transcription_id', transcriptionId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1
    const versionType = `H-${nextVersionNumber}`

    // Use actual edits provided from UI (only segments user explicitly changed)
    // OR fall back to empty if not provided
    const editTrackingData = {
      edits: actual_edits || [],
      total_edits: actual_edits ? actual_edits.length : 0,
      transcription_version_id: '',
      audio_file_id: transcription.audio_file_id
    }

    // Create new version
    const { data: newVersion, error: insertError } = await supabase
      .from('max_transcription_versions')
      .insert({
        transcription_id: transcriptionId,
        version_number: nextVersionNumber,
        version_type: versionType,
        edited_text: finalEditedText,
        json_with_timestamps: finalJsonWithTimestamps || transcription.json_with_timestamps,
        edited_by: user.id,
        dictionary_corrections_applied: editTrackingData.edits as any // Store the edits array
      })
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      data: newVersion
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create version error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create version' },
      { status: 500 }
    )
  }
}

