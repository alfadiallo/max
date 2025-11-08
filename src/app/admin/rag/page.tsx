import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const RunWorkerButton = nextDynamic(() => import('./RunWorkerButton'), { ssr: false })

interface QueueEntry {
  id: string
  source_id: string | null
  version_id: string | null
  source_max_version_id: string | null
  status: string
  submitted_at: string
  processed_at: string | null
  result_summary: Record<string, any> | null
  error_detail: string | null
  source?: {
    title?: string | null
    metadata?: Record<string, any> | null
  } | null
  version?: {
    version_label?: string | null
  } | null
}

interface QueryEntry {
  id: string
  user_id: string | null
  query_text: string
  created_at: string
  total_results: number | null
  segments_returned?: string[] | null
}

export default async function RAGDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userRole = (user.user_metadata?.role ?? '').toString().toLowerCase()
  const isInternal = ['internal', 'admin', 'superadmin'].includes(userRole)
  if (!isInternal) {
    redirect('/dashboard')
  }

  const [{ data: queueEntries }, queuedCount, processingCount, errorCount, completeCount, contentSegmentsCount, entitiesCount, relationshipsCount, queriesResult] = await Promise.all([
    supabase
      .from('rag_ingestion_queue')
      .select(`
        id,
        source_id,
        version_id,
        source_max_version_id,
        status,
        submitted_at,
        processed_at,
        result_summary,
        error_detail,
        source:content_sources (
          title,
          metadata
        ),
        version:transcript_versions (
          version_label
        )
      `)
      .order('submitted_at', { ascending: false })
      .limit(25),
    supabase.from('rag_ingestion_queue').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('rag_ingestion_queue').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    supabase.from('rag_ingestion_queue').select('*', { count: 'exact', head: true }).eq('status', 'error'),
    supabase.from('rag_ingestion_queue').select('*', { count: 'exact', head: true }).eq('status', 'complete'),
    supabase.from('content_segments').select('*', { count: 'exact', head: true }),
    supabase.from('kg_entities').select('*', { count: 'exact', head: true }),
    supabase.from('kg_relationships').select('*', { count: 'exact', head: true }),
    supabase
      .from('user_queries')
      .select('id, user_id, query_text, created_at, total_results, segments_returned')
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  const queue = (queueEntries ?? []) as QueueEntry[]
  const queries = (queriesResult.data ?? []) as QueryEntry[]

  const segmentIds = Array.from(
    new Set(
      queries.flatMap((query) => query.segments_returned ?? []),
    ),
  ).slice(0, 100)

  let topSources: Array<{ sourceId: string; count: number; audioName: string | null; projectName: string | null }> = []

  if (segmentIds.length > 0) {
    const { data: segmentMeta } = await supabase
      .from('content_segments')
      .select('id, source_id')
      .in('id', segmentIds)

    const counts = new Map<string, number>()
    segmentMeta?.forEach((row) => {
      if (row.source_id) {
        counts.set(row.source_id, (counts.get(row.source_id) ?? 0) + 1)
      }
    })

    const topSourceIds = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    if (topSourceIds.length > 0) {
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
        .in(
          'id',
          topSourceIds.map((entry) => entry[0]),
        )

      const meta: Record<string, { audioName: string | null; projectName: string | null }> = {}
      sources?.forEach((item: any) => {
        const audio = Array.isArray(item.audio) ? item.audio[0] : item.audio
        const project = audio && Array.isArray(audio.project) ? audio.project[0] : audio?.project
        meta[item.id] = {
          audioName: audio?.display_name || audio?.file_name || null,
          projectName: project?.name || null,
        }
      })

      topSources = topSourceIds.map(([sourceId, count]) => ({
        sourceId,
        count,
        audioName: meta[sourceId]?.audioName ?? null,
        projectName: meta[sourceId]?.projectName ?? null,
      }))
    }
  }

  const cards = [
    { title: 'Queued Jobs', count: queuedCount.count ?? 0, tint: 'bg-yellow-100 text-yellow-800' },
    { title: 'Processing', count: processingCount.count ?? 0, tint: 'bg-blue-100 text-blue-800' },
    { title: 'Errors', count: errorCount.count ?? 0, tint: 'bg-red-100 text-red-800' },
    { title: 'Completed', count: completeCount.count ?? 0, tint: 'bg-green-100 text-green-800' },
    { title: 'Indexed Segments', count: contentSegmentsCount.count ?? 0, tint: 'bg-slate-100 text-slate-800' },
    { title: 'Graph Entities', count: entitiesCount.count ?? 0, tint: 'bg-purple-100 text-purple-800' },
    { title: 'Graph Relationships', count: relationshipsCount.count ?? 0, tint: 'bg-pink-100 text-pink-800' },
  ]

  const getSourceDisplay = (job: QueueEntry) => {
    const metadata = (job.source?.metadata ?? {}) as Record<string, any>
    const audioName = metadata?.audioFileName || metadata?.audio_file_name
    const projectName = metadata?.projectName || metadata?.project_name
    const title =
      job.source?.title ||
      audioName ||
      job.source_id ||
      '—'

    const versionLabel = job.version?.version_label || null
    const subtitle =
      versionLabel ? `Version: ${versionLabel}` : null
    return {
      title,
      subtitle,
    }
  }

  const renderSummary = (job: QueueEntry) => {
    if (job.result_summary) {
      const summary = job.result_summary
      return (
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <div>{summary.notes || 'Processed'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-2">
            {summary.segments_processed !== undefined && (
              <span>{summary.segments_processed} segments</span>
            )}
            {summary.entities_linked !== undefined && (
              <span>{summary.entities_linked} entities</span>
            )}
            {summary.relationships_linked !== undefined && (
              <span>{summary.relationships_linked} relationships</span>
            )}
            {summary.duration_ms !== undefined && (
              <span>{summary.duration_ms} ms</span>
            )}
            {summary.embedding_model && (
              <span>Embedding: {summary.embedding_model}</span>
            )}
            {summary.claude_model && (
              <span>Claude: {summary.claude_model}</span>
            )}
          </div>
        </div>
      )
    }

    if (job.error_detail) {
      let message = job.error_detail
      try {
        const parsed = JSON.parse(job.error_detail)
        if (parsed?.message) {
          message = parsed.message
        } else if (typeof parsed === 'object') {
          message = JSON.stringify(parsed)
        }
      } catch {
        // ignore parse errors and use raw string
      }

      return <span className="text-sm text-red-600 dark:text-red-400">Error: {message}</span>
    }

    return <span className="text-sm text-gray-400">—</span>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-10 px-6 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Max RAG Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Monitor ingestion jobs, indexed content, and user search activity.
            </p>
          </div>
        <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 dark:bg-gray-950 dark:text-blue-300 dark:border-blue-700"
            >
              ← Back to Projects
            </Link>
            <Link
              href="/admin/rag/segments"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 border border-purple-200 rounded-lg bg-white hover:bg-purple-50 dark:bg-gray-950 dark:text-purple-300 dark:border-purple-700"
            >
              View Segments →
            </Link>
            <RunWorkerButton />
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:bg-gray-950 dark:border-gray-800">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{card.title}</p>
              <p className={`mt-2 text-2xl font-semibold ${card.tint}`}>{card.count.toLocaleString()}</p>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-950 dark:border-gray-800">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Queue Activity</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Last {queue.length} submissions to the ingestion pipeline.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Processed</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Summary</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      No ingestion jobs yet.
                    </td>
                  </tr>
                ) : (
                  queue.map((job) => (
                    <tr key={job.id} className="bg-white dark:bg-gray-950">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusTint(job.status)}`}>
                          {job.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const display = getSourceDisplay(job)
                          return (
                            <div className="text-sm text-gray-800 dark:text-gray-200">
                              {display.title}
                              {display.subtitle && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {display.subtitle}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {new Date(job.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {job.processed_at ? new Date(job.processed_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {renderSummary(job)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 space-x-2">
                        {job.status === 'error' && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/admin/rag/jobs/requeue', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ jobId: job.id }),
                                })
                                const result = await response.json()
                                if (!response.ok || !result?.ok) {
                                  alert(result?.error || 'Failed to requeue job')
                                } else {
                                  alert('Job requeued')
                                  window.location.reload()
                                }
                              } catch (error: any) {
                                alert(error.message)
                              }
                            }}
                            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const confirmed = window.confirm('Delete this submission and all associated segments?')
                            if (!confirmed) return
                            try {
                              const response = await fetch('/api/admin/rag/jobs/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ jobId: job.id }),
                              })
                              const result = await response.json()
                              if (!response.ok || !result?.ok) {
                                alert(result?.error || 'Failed to delete submission')
                              } else {
                                alert('Submission deleted')
                                window.location.reload()
                              }
                            } catch (error: any) {
                              alert(error.message)
                            }
                          }}
                          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-950 dark:border-gray-800">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent User Queries</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Latest questions asked against the RAG search endpoint.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">When</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Query</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Results</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {queries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      No queries have been logged yet.
                    </td>
                  </tr>
                ) : (
                  queries.map((query) => (
                    <tr key={query.id} className="bg-white dark:bg-gray-950">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {new Date(query.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                        {query.query_text}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {query.total_results ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                        {query.user_id ?? 'anonymous'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-950 dark:border-gray-800">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Most Referenced Transcripts</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aggregated from the last {segmentIds.length} chunk mentions across recent queries.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Transcription ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Audio File</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Chunk Mentions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {topSources.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      No query activity yet.
                    </td>
                  </tr>
                ) : (
                  topSources.map((item) => (
                    <tr key={item.sourceId} className="bg-white dark:bg-gray-950">
                      <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-300">{item.sourceId}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{item.audioName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.projectName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-semibold">{item.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

function statusTint(status: string) {
  switch (status) {
    case 'queued':
      return 'bg-yellow-100 text-yellow-800'
    case 'processing':
      return 'bg-blue-100 text-blue-800'
    case 'complete':
      return 'bg-green-100 text-green-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
