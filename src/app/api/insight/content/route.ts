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

    // Get content outputs for this transcript
    const { data: contentOutputs, error: contentError } = await supabase
      .from('insight_content_outputs')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .order('created_at', { ascending: false })

    if (contentError) {
      console.error('Error fetching content outputs:', contentError)
      return Response.json({ success: false, error: contentError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: contentOutputs || []
    })

  } catch (error: any) {
    console.error('Error in content list:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

