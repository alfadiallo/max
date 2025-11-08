import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => null)
  const jobId = body?.jobId as string | undefined
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const { data: existingJob, error: fetchError } = await supabase
    .from('rag_ingestion_queue')
    .select('id, status')
    .eq('id', jobId)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!existingJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('rag_ingestion_queue')
    .update({
      status: 'queued',
      error_detail: null,
      processed_at: null,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}


