import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { query_id, helpful } = await request.json()

    if (!query_id || typeof helpful !== 'boolean') {
      return Response.json({ success: false, error: 'query_id and helpful flag are required' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('user_queries')
      .update({
        helpful,
      })
      .eq('id', query_id)
      .eq('user_id', user.id)

    if (error) {
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('RAG feedback error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}


