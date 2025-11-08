import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

type DeleteStrategy = { name: string; applyFilter: (query: any) => any }

const TABLES_IN_DELETE_ORDER: DeleteStrategy[] = [
  {
    name: 'segment_entities',
    applyFilter: (query) => query.gte('created_at', '1900-01-01'),
  },
  {
    name: 'kg_relationships',
    applyFilter: (query) => query.gte('created_at', '1900-01-01'),
  },
  {
    name: 'kg_entities',
    applyFilter: (query) => query.gte('created_at', '1900-01-01'),
  },
  {
    name: 'segment_relevance',
    applyFilter: (query) => query.gte('created_at', '1900-01-01'),
  },
  {
    name: 'content_segments',
    applyFilter: (query) => query.gte('created_at', '1900-01-01'),
  },
  {
    name: 'rag_ingestion_queue',
    applyFilter: (query) => query.neq('id', NEVER_MATCH_UUID),
  },
]

const NEVER_MATCH_UUID = '00000000-0000-0000-0000-000000000000'

export async function POST(_: NextRequest) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    }

    const role = (user.user_metadata?.role ?? '').toString().toLowerCase()
    const isAdmin = ['admin', 'internal', 'superadmin'].includes(role)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers })
    }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Service role credentials are not configured' }, { status: 500, headers })
  }

  const admin = createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

    const clearedTables: string[] = []

    for (const { name, applyFilter } of TABLES_IN_DELETE_ORDER) {
      const { error } = await applyFilter(admin.from(name).delete({ count: 'exact' }))

      if (error) {
        console.error('Failed to clear table', name, error)
        return NextResponse.json({ error: `Failed to clear ${name}`, details: error.message }, { status: 500, headers })
      }

      clearedTables.push(name)
    }

  const { error: resetSourcesError } = await admin
    .from('content_sources')
    .update({
      rag_processed_version_id: null,
      transcription_status: 'queued_for_rag',
    })
    .eq('transcription_status', 'ingested')

  if (resetSourcesError) {
      return NextResponse.json({ error: 'Failed to reset content sources', details: resetSourcesError.message }, { status: 500, headers })
  }

  return NextResponse.json({
    ok: true,
    tables_cleared: clearedTables,
    }, { status: 200, headers })
  } catch (error) {
    console.error('Reset RAG data failed', error)
    return NextResponse.json(
      {
        error: 'Failed to reset RAG data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers },
    )
  }
}
