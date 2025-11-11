import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    const { query, limit = 15, distance_threshold = 0.9 } = await request.json()

    if (!query) {
      return Response.json({ success: false, error: 'Query is required' }, { status: 400 })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('[RAG Search] No user found - auth issue')
      console.error('[RAG Search] Cookies:', await cookies().then(c => c.getAll().map(c => c.name)))
      return Response.json({ success: false, error: 'Unauthorized - session expired. Please sign in again.' }, { status: 401 })
    }

    console.log('[RAG Search] Authenticated user:', user.id)

    const openai = new OpenAI()
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })

    const queryEmbedding = response.data[0].embedding

    console.log('[RAG Search] Calling match_rag_content with:', {
      query,
      limit,
      distance_threshold,
      embedding_length: queryEmbedding.length,
    })

    const { data: vectorResults, error } = await supabase.rpc('match_rag_content', {
      p_query_embedding: queryEmbedding,
      p_limit: limit,
      p_distance_threshold: distance_threshold,
    })

    console.log('[RAG Search] match_rag_content returned:', {
      results_count: vectorResults?.length ?? 0,
      error: error?.message,
    })

    if (error) {
      console.error('match_rag_content error:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }

    type VectorResult = {
      segment_id: string
      source_id: string | null
      version_id: string | null
      segment_text: string
      start_timestamp: string | null
      end_timestamp: string | null
      created_at: string | null
      distance: number
      relevance_dentist?: number | null
      relevance_dental_assistant?: number | null
      relevance_hygienist?: number | null
      relevance_treatment_coordinator?: number | null
      relevance_align_rep?: number | null
      content_type?: string | null
      clinical_complexity?: string | null
      primary_focus?: string | null
      topics?: string[] | null
      confidence_score?: number | null
    }

    let matches: VectorResult[] = (vectorResults as VectorResult[] | null) ?? []
    let searchMode: 'vector' | 'lexical' = 'vector'

    if (matches.length === 0) {
      const trimmed = query.trim()
      if (trimmed.length > 0) {
        const pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`
        const { data: fallbackResults, error: fallbackError } = await supabase
          .from('content_segments')
          .select(
            'id, source_id, version_id, segment_text, start_timestamp, end_timestamp, created_at',
          )
          .ilike('segment_text', pattern)
          .limit(limit)

        if (fallbackError) {
          console.error('lexical fallback error:', fallbackError)
        } else if (fallbackResults && fallbackResults.length > 0) {
          searchMode = 'lexical'
          matches = fallbackResults.map((item) => ({
            segment_id: item.id,
            source_id: item.source_id,
            version_id: item.version_id,
            segment_text: item.segment_text,
            start_timestamp: item.start_timestamp,
            end_timestamp: item.end_timestamp,
            created_at: item.created_at,
            distance: Number.NaN,
            relevance_dentist: null,
            relevance_dental_assistant: null,
            relevance_hygienist: null,
            relevance_treatment_coordinator: null,
            relevance_align_rep: null,
            content_type: null,
            clinical_complexity: null,
            primary_focus: null,
            topics: [],
            confidence_score: null,
          }))
        }
      }
    }

    const sourceIds = Array.from(new Set(matches.map((r: any) => r.source_id).filter(Boolean)))
    const sourceMeta: Record<string, { audioName: string | null; projectName: string | null }> = {}

    if (sourceIds.length > 0) {
      const { data: sources } = await supabase
        .from('max_transcriptions')
        .select(
          `
          id,
          audio:max_audio_files(
            file_name,
            display_name,
            project:max_projects(name)
          )
        `,
        )
        .in('id', sourceIds)

      sources?.forEach((item: any) => {
        const audio = Array.isArray(item.audio) ? item.audio[0] : item.audio
        const project = audio && Array.isArray(audio.project) ? audio.project[0] : audio?.project
        sourceMeta[item.id] = {
          audioName: audio?.display_name || audio?.file_name || null,
          projectName: project?.name || null,
        }
      })
    }

    type EnrichedResult = {
      chunk_id: string
      source_id: string | null
      version_id: string | null
      chunk_text: string
      start_timestamp: string | null
      end_timestamp: string | null
      created_at: string | null
      distance: number | null
      audio_file_name: string | null
      project_name: string | null
      relevance_scores: {
        dentist?: number | null
        dental_assistant?: number | null
        hygienist?: number | null
        treatment_coordinator?: number | null
        align_rep?: number | null
      }
      content_metadata: {
        content_type?: string | null
        clinical_complexity?: string | null
        primary_focus?: string | null
        topics?: string[] | null
        confidence_score?: number | null
      }
    }

    const enrichedResults: EnrichedResult[] = matches.map((result: any) => {
      const meta = sourceMeta[result.source_id] || { audioName: null, projectName: null }
      const distanceValue =
        typeof result.distance === 'number' && !Number.isNaN(result.distance) ? result.distance : null
      return {
        chunk_id: result.segment_id,
        source_id: result.source_id,
        version_id: result.version_id,
        chunk_text: result.segment_text,
        start_timestamp: result.start_timestamp,
        end_timestamp: result.end_timestamp,
        created_at: result.created_at,
        distance: distanceValue,
        audio_file_name: meta.audioName,
        project_name: meta.projectName,
        relevance_scores: {
          dentist: result.relevance_dentist ?? null,
          dental_assistant: result.relevance_dental_assistant ?? null,
          hygienist: result.relevance_hygienist ?? null,
          treatment_coordinator: result.relevance_treatment_coordinator ?? null,
          align_rep: result.relevance_align_rep ?? null,
        },
        content_metadata: {
          content_type: result.content_type ?? null,
          clinical_complexity: result.clinical_complexity ?? null,
          primary_focus: result.primary_focus ?? null,
          topics: result.topics ?? [],
          confidence_score: result.confidence_score ?? null,
        },
      }
    })

    const { data: queryRecord } = await supabase
      .from('user_queries')
      .insert({
        user_id: user.id,
        query_text: query,
        query_embedding: queryEmbedding,
        total_results: enrichedResults.length,
        segments_returned: enrichedResults.map((res) => res.chunk_id),
      })
      .select('id')
      .maybeSingle()

    return Response.json({
      success: true,
      data: enrichedResults,
      query_id: queryRecord?.id ?? null,
      search_strategy: searchMode,
    })
  } catch (error: any) {
    console.error('RAG search error:', error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
