import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/audio/delete?id=xxx
export async function DELETE(req: NextRequest) {
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
    const audioFileId = searchParams.get('id')

    if (!audioFileId) {
      return NextResponse.json(
        { success: false, error: 'Missing audio file id' },
        { status: 400 }
      )
    }

    // Get audio file info
    const { data: audioFile, error: fetchError } = await supabase
      .from('max_audio_files')
      .select('*')
      .eq('id', audioFileId)
      .single()

    if (fetchError || !audioFile) {
      return NextResponse.json(
        { success: false, error: 'Audio file not found' },
        { status: 404 }
      )
    }

    // Verify user owns the audio file (via project ownership)
    const { data: project } = await supabase
      .from('max_projects')
      .select('created_by')
      .eq('id', audioFile.project_id)
      .single()

    if (!project || project.created_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to delete this file' },
        { status: 403 }
      )
    }

    // First, delete all transcriptions and their versions for this audio file
    // Get all transcription IDs for this audio file
    const { data: transcriptions } = await supabase
      .from('max_transcriptions')
      .select('id')
      .eq('audio_file_id', audioFileId)

    if (transcriptions && transcriptions.length > 0) {
      const transcriptionIds = transcriptions.map(t => t.id)
      
      // Delete all transcription versions
      const { error: versionsDeleteError } = await supabase
        .from('max_transcription_versions')
        .delete()
        .in('transcription_id', transcriptionIds)

      if (versionsDeleteError) {
        console.error('Transcription versions delete error:', versionsDeleteError)
      }

      // Delete all transcriptions
      const { error: transcriptionsDeleteError } = await supabase
        .from('max_transcriptions')
        .delete()
        .eq('audio_file_id', audioFileId)

      if (transcriptionsDeleteError) {
        console.error('Transcriptions delete error:', transcriptionsDeleteError)
      }
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('max-audio')
      .remove([audioFile.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Finally, delete from database
    const { error: dbError } = await supabase
      .from('max_audio_files')
      .delete()
      .eq('id', audioFileId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete from database' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Audio file deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Delete failed' },
      { status: 500 }
    )
  }
}

