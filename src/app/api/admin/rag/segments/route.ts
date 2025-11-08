import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const url = new URL(request.url)
  const search = url.searchParams.get('search')?.trim() || ''
  const sourceId = url.searchParams.get('sourceId')?.trim() || ''
  const versionId = url.searchParams.get('versionId')?.trim() || ''
  const page = Number(url.searchParams.get('page') || '1')
  const limitParam = Number(url.searchParams.get('limit') || DEFAULT_LIMIT)
  const limit = Math.min(Math.max(limitParam, 1), MAX_LIMIT)
  const offset = (page - 1) * limit

  const { data: sessionData } = await supabase.auth.getUser()
  const user = sessionData.user

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = (user.user_metadata?.role ?? '').toString().toLowerCase()
  const isAdmin = ['admin', 'internal', 'superadmin'].includes(role)

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query = supabase
    .from('content_segments')
    .select(
      `
        id,
        source_id,
        version_id,
        segment_text,
        sequence_number,
        start_timestamp,
        end_timestamp,
        created_at,
        embedding,
        transcript_versions(
          version_label,
          created_at
        ),
        content_sources(
          title,
          metadata
        ),
        segment_relevance(
          relevance_dentist,
          relevance_dental_assistant,
          relevance_hygienist,
          relevance_treatment_coordinator,
          relevance_align_rep,
          content_type,
          clinical_complexity,
          primary_focus,
          topics,
          confidence_score
        )
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (sourceId) {
    query = query.eq('source_id', sourceId)
  }

  if (versionId) {
    query = query.eq('version_id', versionId)
  }

  if (search) {
    query = query.ilike('segment_text', `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[segments] failed to load content segments', error)
    return NextResponse.json({ error: 'Failed to fetch segments', details: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      nextPage: count && offset + limit < count ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  })
}


