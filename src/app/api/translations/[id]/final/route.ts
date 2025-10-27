import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const translationId = params.id
    const body = await req.json()
    const { version_id } = body // null for original, or UUID for H-X

    const { data, error } = await supabase
      .from('max_translations')
      .update({ final_version_id: version_id })
      .eq('id', translationId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 200 })

  } catch (error: any) {
    console.error('Error setting final translation version:', error)
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

    const translationId = params.id

    const { data: translation, error } = await supabase
      .from('max_translations')
      .select('final_version_id')
      .eq('id', translationId)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: translation.final_version_id }, { status: 200 })

  } catch (error: any) {
    console.error('Error fetching final translation version:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch final version' },
      { status: 500 }
    )
  }
}

