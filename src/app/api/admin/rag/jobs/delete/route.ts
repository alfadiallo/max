import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Service role credentials are not configured' }, { status: 500 })
  }

  const admin = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: job, error: fetchError } = await admin
    .from('rag_ingestion_queue')
    .select('id, source_id, version_id')
    .eq('id', jobId)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.version_id) {
    const { error: deleteVersionError } = await admin.from('transcript_versions').delete().eq('id', job.version_id)
    if (deleteVersionError) {
      return NextResponse.json({ error: deleteVersionError.message }, { status: 500 })
    }
  }

  const { error: deleteJobError } = await admin.from('rag_ingestion_queue').delete().eq('id', jobId)
  if (deleteJobError) {
    return NextResponse.json({ error: deleteJobError.message }, { status: 500 })
  }

  if (job.source_id) {
    const { count: remainingVersions } = await admin
      .from('transcript_versions')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', job.source_id)

    if ((remainingVersions ?? 0) === 0) {
      await admin.from('content_sources').delete().eq('id', job.source_id)
    }
  }

  return NextResponse.json({ ok: true })
}


