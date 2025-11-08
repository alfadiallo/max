import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FUNCTION_URL = (() => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  if (!base) return ''
  const host = base.replace(/\/$/, '').replace('.supabase.co', '.functions.supabase.co')
  return `${host}/process_rag_queue`
})()

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = (user.user_metadata?.role ?? '').toString().toLowerCase()
    const isAdmin = ['admin', 'internal', 'superadmin'].includes(role)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!FUNCTION_URL) {
      return NextResponse.json({ error: 'Function URL not configured' }, { status: 500 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({}),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json({ error: payload?.error || 'Failed to invoke worker', details: payload }, { status: 500 })
    }

    return NextResponse.json({ ok: true, summary: payload })
  } catch (error: any) {
    console.error('RAG worker manual run error', error)
    return NextResponse.json({ error: error.message || 'Failed to run worker' }, { status: 500 })
  }
}


