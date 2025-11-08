import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const TABLES_IN_DELETE_ORDER = [
  'segment_entities',
  'kg_relationships',
  'kg_entities',
  'segment_relevance',
  'content_segments',
  'rag_ingestion_queue',
]

const NEVER_MATCH_UUID = '00000000-0000-0000-0000-000000000000'

export async function POST(_: NextRequest) {
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Service role credentials are not configured' }, { status: 500 })
  }

  const admin = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const clearedTables: string[] = []

  for (const table of TABLES_IN_DELETE_ORDER) {
    const { error } = await admin
      .from(table)
      .delete()
      .neq('id', NEVER_MATCH_UUID)

    if (error) {
      return NextResponse.json({ error: `Failed to clear ${table}`, details: error.message }, { status: 500 })
    }

    clearedTables.push(table)
  }

  const { error: resetSourcesError } = await admin
    .from('content_sources')
    .update({
      rag_processed_version_id: null,
      transcription_status: 'queued_for_rag',
    })
    .eq('transcription_status', 'ingested')

  if (resetSourcesError) {
    return NextResponse.json({ error: 'Failed to reset content sources', details: resetSourcesError.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    tables_cleared: clearedTables,
  })
}


