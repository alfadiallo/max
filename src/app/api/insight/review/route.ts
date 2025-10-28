import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Get all content outputs for review
    // Join with transcriptions to filter by user ownership
    const { data: contentOutputs, error: contentError } = await supabase
      .from('insight_content_outputs')
      .select(`
        *,
        transcription:max_transcriptions(
          id,
          audio_file_id,
          audio:max_audio_files(
            file_name,
            project:max_projects(
              name,
              created_by
            )
          )
        )
      `)

    if (contentError) {
      console.error('Error fetching content outputs:', contentError)
      return Response.json({ success: false, error: contentError.message }, { status: 500 })
    }

    // Filter to only show content from transcripts owned by the user
    const userContent = contentOutputs?.filter(output => 
      output.transcription?.audio?.project?.created_by === user.id
    ) || []

    return Response.json({
      success: true,
      data: userContent
    })

  } catch (error: any) {
    console.error('Error in review list:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status, content } = await request.json()

    if (!id) {
      return Response.json({ success: false, error: 'id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Build update object
    const updateData: any = {}
    if (status) updateData.status = status
    if (content) updateData.content = content
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('insight_content_outputs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating content:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      data
    })

  } catch (error: any) {
    console.error('Error in review update:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

