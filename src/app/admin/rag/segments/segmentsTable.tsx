'use client'

import { useEffect, useMemo, useState } from 'react'

interface SegmentRelevance {
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

interface SegmentRecord {
  id: string
  source_id: string
  version_id: string
  segment_text: string
  sequence_number: number
  start_timestamp: string | null
  end_timestamp: string | null
  created_at: string
  embedding: number[] | null
  transcript_versions?: {
    version_label?: string | null
    created_at?: string | null
  } | null
  content_sources?: {
    title?: string | null
    metadata?: Record<string, any> | null
  } | null
  segment_relevance?: SegmentRelevance | null
}

interface ApiResponse {
  data: SegmentRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    nextPage: number | null
    prevPage: number | null
  }
}

const formatTimeInterval = (value: string | null) => {
  if (!value) return '—'
  const parts = value.split(':')
  if (parts.length < 3) return value
  const [hours, minutes, seconds] = parts
  const s = Number(seconds).toFixed(0).padStart(2, '0')
  if (hours === '00') {
    return `${minutes}:${s}`
  }
  return `${hours}:${minutes}:${s}`
}

const relevanceToBadges = (relevance: SegmentRelevance | null | undefined) => {
const formatRelativeTime = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const diffMs = Date.now() - date.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const diffMinutes = Math.round(diffSeconds / 60)
  const diffHours = Math.round(diffMinutes / 60)
  const diffDays = Math.round(diffHours / 24)

  if (Math.abs(diffSeconds) < 45) return `${diffSeconds}s ago`
  if (Math.abs(diffMinutes) < 45) return `${diffMinutes}m ago`
  if (Math.abs(diffHours) < 36) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

  if (!relevance) return []
  const entries: Array<{ label: string; score: number }> = []
  const map: Record<string, string> = {
    relevance_dentist: 'Dentist',
    relevance_dental_assistant: 'Assistant',
    relevance_hygienist: 'Hygienist',
    relevance_treatment_coordinator: 'Coordinator',
    relevance_align_rep: 'Align Rep',
  }
  Object.entries(map).forEach(([key, label]) => {
    const score = relevance[key as keyof SegmentRelevance]
    if (typeof score === 'number') {
      entries.push({ label, score })
    }
  })
  return entries
}

export default function SegmentsTable() {
  const [segments, setSegments] = useState<SegmentRecord[]>([])
  const [pagination, setPagination] = useState<ApiResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sourceId, setSourceId] = useState('')
  const [versionId, setVersionId] = useState('')

  const [selectedSegment, setSelectedSegment] = useState<SegmentRecord | null>(null)

  const loadSegments = async () => {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('page', page.toString())
    if (search.trim()) params.set('search', search.trim())
    if (sourceId.trim()) params.set('sourceId', sourceId.trim())
    if (versionId.trim()) params.set('versionId', versionId.trim())

    try {
      const response = await fetch(`/api/admin/rag/segments?${params.toString()}`, {
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Failed to load segments')
      }
      const payload: ApiResponse = await response.json()
      setSegments(payload.data)
      setPagination(payload.pagination)
    } catch (err: any) {
      console.error('[segments-table] fetch failed', err)
      setError(err.message ?? 'Failed to load segments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSegments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const projectAndAudio = (segment: SegmentRecord) => {
    const metadata = segment.content_sources?.metadata ?? {}
    const audioName = metadata?.audioFileName || metadata?.audio_file_name
    const projectName = metadata?.projectName || metadata?.project_name
    return { audioName, projectName }
  }

  const totalSegments = pagination?.total ?? 0
  const hasFilters = Boolean(search || sourceId || versionId)

  const summaryTotals = useMemo(() => {
    const withEmbedding = segments.filter((seg) => Array.isArray(seg.embedding) && seg.embedding.length > 0).length
    return {
      withEmbedding,
      withoutEmbedding: segments.length - withEmbedding,
    }
  }, [segments])

  return (
    <div className="space-y-4">
      <section className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Filters</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-xs text-gray-600 dark:text-gray-400 gap-1">
            Search text
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Contains text…"
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600 dark:text-gray-400 gap-1">
            Source ID
            <input
              type="text"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              placeholder="UUID"
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 font-mono"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600 dark:text-gray-400 gap-1">
            Version ID
            <input
              type="text"
              value={versionId}
              onChange={(event) => setVersionId(event.target.value)}
              placeholder="UUID"
              className="rounded border border-gray-300 px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 font-mono"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPage(1)
              loadSegments()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            Apply filters
          </button>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('')
                setSourceId('')
                setVersionId('')
                setPage(1)
                loadSegments()
              }}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:underline"
            >
              Reset
            </button>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            Showing {segments.length} of {totalSegments.toLocaleString()} segments (page {pagination?.page ?? 1})
          </span>
        </div>
      </section>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {loading ? 'Loading segments…' : `${summaryTotals.withEmbedding} with embeddings · ${summaryTotals.withoutEmbedding} missing embeddings`}
          </div>
          {pagination && (
            <div className="flex items-center gap-2 text-sm">
              <button
                disabled={!pagination.prevPage || loading}
                onClick={() => pagination.prevPage && setPage(pagination.prevPage)}
                className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {pagination.page} · {Math.ceil((pagination.total || 0) / (pagination.limit || 1))} total
              </span>
              <button
                disabled={!pagination.nextPage || loading}
                onClick={() => pagination.nextPage && setPage(pagination.nextPage)}
                className="px-3 py-1 rounded border border-gray-300 text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Segment</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Source</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Timing</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Relevance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Created</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Embedding</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {loading ? 'Loading…' : 'No segments found for this filter.'}
                  </td>
                </tr>
              ) : (
                segments.map((segment) => {
                  const relevanceBadges = relevanceToBadges(segment.segment_relevance)
                  const { audioName, projectName } = projectAndAudio(segment)
                  const versionLabel = segment.transcript_versions?.version_label || '—'

                  return (
                    <tr key={segment.id} className="bg-white dark:bg-gray-950">
                      <td className="px-4 py-3 max-w-xs align-top">
                        <div className="text-sm text-gray-900 dark:text-gray-100 line-clamp-3">{segment.segment_text}</div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          seq {segment.sequence_number} · {segment.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {segment.content_sources?.title || audioName || 'Untitled source'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {versionLabel} · {projectName ? `${projectName} • ` : ''}{segment.source_id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-gray-700 dark:text-gray-200">
                        <div>
                          {formatTimeInterval(segment.start_timestamp)} – {formatTimeInterval(segment.end_timestamp)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-gray-300">
                        {relevanceBadges.length === 0 ? (
                          <span className="text-gray-400">n/a</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {relevanceBadges.map((badge) => (
                              <span
                                key={badge.label}
                                className="px-2 py-[2px] rounded-full border border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-200"
                              >
                                {badge.label} {badge.score.toFixed(0)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-gray-300">
                        <div>{new Date(segment.created_at).toLocaleString()}</div>
                        <div className="text-gray-400">
                          {formatRelativeTime(segment.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-600 dark:text-gray-300">
                        {segment.embedding && segment.embedding.length > 0 ? (
                          <span className="text-green-600 dark:text-green-400">Yes</span>
                        ) : (
                          <span className="text-red-500 dark:text-red-300">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <button
                          onClick={() => setSelectedSegment(segment)}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedSegment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-40 px-4"
          onClick={() => setSelectedSegment(null)}
        >
          <div
            className="bg-white dark:bg-gray-950 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Segment detail</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Source {selectedSegment.source_id} · Version {selectedSegment.version_id}
                </p>
              </div>
              <button
                onClick={() => setSelectedSegment(null)}
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4 space-y-4 text-sm text-gray-800 dark:text-gray-200">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Segment Text</h4>
                <p className="whitespace-pre-wrap leading-relaxed">{selectedSegment.segment_text}</p>
              </section>

              <section className="grid md:grid-cols-2 gap-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Timing</h4>
                  <p>
                    {formatTimeInterval(selectedSegment.start_timestamp)} – {formatTimeInterval(selectedSegment.end_timestamp)}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Created</h4>
                  <p>{new Date(selectedSegment.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Embedding</h4>
                  <p>{selectedSegment.embedding && selectedSegment.embedding.length > 0 ? `${selectedSegment.embedding.length} dimensions` : 'Not available'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Relevance</h4>
                  {relevanceToBadges(selectedSegment.segment_relevance).length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No scores yet</p>
                  ) : (
                    <ul className="space-y-1">
                      {relevanceToBadges(selectedSegment.segment_relevance).map((badge) => (
                        <li key={badge.label}>
                          {badge.label}: <span className="font-medium">{badge.score.toFixed(0)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedSegment.segment_relevance?.topics && selectedSegment.segment_relevance.topics.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Topics: {selectedSegment.segment_relevance.topics.join(', ')}
                    </p>
                  )}
                </div>
              </section>

              <section className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-300">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Raw Metadata</h4>
                <pre className="whitespace-pre-wrap break-words">
{JSON.stringify({
  source: selectedSegment.content_sources,
  version: selectedSegment.transcript_versions,
  relevance: selectedSegment.segment_relevance,
}, null, 2)}
                </pre>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


