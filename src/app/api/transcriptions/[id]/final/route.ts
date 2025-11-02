import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const transcriptionId = params.id
    const body = await req.json()
    const { version_id } = body // This can be a version ID or null (to unpromote)

    // First, verify the transcription exists and user has access
    const { data: existingTranscription, error: fetchError } = await supabase
      .from('max_transcriptions')
      .select('id, audio_file_id')
      .eq('id', transcriptionId)
      .single()

    if (fetchError || !existingTranscription) {
      return NextResponse.json(
        { success: false, error: 'Transcription not found or access denied' },
        { status: 404 }
      )
    }

    // If version_id is provided, verify it exists (unless it's null for T-1)
    if (version_id !== null) {
      const { data: versionExists, error: versionError } = await supabase
        .from('max_transcription_versions')
        .select('id')
        .eq('id', version_id)
        .eq('transcription_id', transcriptionId)
        .single()

      if (versionError || !versionExists) {
        return NextResponse.json(
          { success: false, error: 'Version not found or does not belong to this transcription' },
          { status: 404 }
        )
      }
    }

    // Update the transcription to mark this version as final
    const { data: transcription, error: updateError } = await supabase
      .from('max_transcriptions')
      .update({ final_version_id: version_id })
      .eq('id', transcriptionId)
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    if (!transcription) {
      return NextResponse.json(
        { success: false, error: 'Update failed - no rows updated. Check RLS policies.' },
        { status: 403 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: transcription 
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error setting final version:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set final version' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const transcriptionId = params.id

    // Get the transcription with its final_version_id
    const { data: transcription, error } = await supabase
      .from('max_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: transcription })

  } catch (error: any) {
    console.error('Error getting final version:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get final version' },
      { status: 500 }
    )
  }
}








