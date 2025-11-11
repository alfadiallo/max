'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

interface RAGResult {
  chunk_id: string
  source_id: string | null
  version_id: string | null
  segment_text: string
  start_timestamp: string | null
  end_timestamp: string | null
  created_at: string | null
  distance: number
  audio_file_name?: string | null
  project_name?: string | null
  relevance_scores?: {
    dentist?: number | null
    dental_assistant?: number | null
    hygienist?: number | null
    treatment_coordinator?: number | null
    align_rep?: number | null
  }
  content_metadata?: {
    content_type?: string | null
    clinical_complexity?: string | null
    primary_focus?: string | null
    topics?: string[] | null
    confidence_score?: number | null
  }
}

interface ClaudeSource {
  chunk_id: string
  timestamp_start: string | null
  timestamp_end: string | null
  source_id: string | null
  version_id: string | null
  version_label: string | null
  sequence_number: number | null
  title: string | null
  metadata: Record<string, any> | null
}

const formatTimestamp = (value: string | null) => {
  if (!value) return '—'
  const parts = value.split(':')
  if (parts.length < 3) return value
  const [hours, minutes, seconds] = parts
  const sec = Math.floor(Number(seconds))
  const mm = minutes.padStart(2, '0')
  const ss = sec.toString().padStart(2, '0')
  return hours === '00' ? `${mm}:${ss}` : `${hours}:${mm}:${ss}`
}

const similarityBadge = (distance: number) => {
  const similarity = 1 - distance
  if (similarity >= 0.8) return { text: `Similarity ${(similarity).toFixed(2)}`, className: 'text-green-700 bg-green-100' }
  if (similarity >= 0.6) return { text: `Similarity ${(similarity).toFixed(2)}`, className: 'text-blue-700 bg-blue-100' }
  if (similarity >= 0.4) return { text: `Similarity ${(similarity).toFixed(2)}`, className: 'text-yellow-700 bg-yellow-100' }
  return { text: `Similarity ${(similarity).toFixed(2)}`, className: 'text-red-700 bg-red-100' }
}

export default function RAGSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<RAGResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set())
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set())
  const [claudeAnswer, setClaudeAnswer] = useState<string | null>(null)
  const [claudeLoading, setClaudeLoading] = useState(false)
  const [claudeSources, setClaudeSources] = useState<ClaudeSource[]>([])
  const [roleFilter, setRoleFilter] = useState<'any' | 'dentist' | 'dental_assistant' | 'hygienist' | 'treatment_coordinator' | 'align_rep'>('any')
  const [timeFilter, setTimeFilter] = useState<'any' | '7d' | '30d' | '365d'>('any')
  const [queryId, setQueryId] = useState<string | null>(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean | null>(null)

  const toggleExpanded = (chunkId: string) => {
    const next = new Set(expandedChunks)
    if (next.has(chunkId)) {
      next.delete(chunkId)
    } else {
      next.add(chunkId)
    }
    setExpandedChunks(next)
  }

  const toggleChunkSelection = (chunkId: string) => {
    const next = new Set(selectedChunks)
    if (next.has(chunkId)) {
      next.delete(chunkId)
    } else {
      next.add(chunkId)
    }
    setSelectedChunks(next)
  }

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    setResults([])
    setSelectedChunks(new Set())
    setClaudeAnswer(null)
    setClaudeSources([])
    setFeedbackSubmitted(null)
    setQueryId(null)

    try {
      const response = await fetch('/api/insight/rag-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 15 }),
      })
      const payload = await response.json()
      console.log('[RAG Search] Response payload:', payload)
      console.log('[RAG Search] Results count:', payload.data?.length || 0)
      if (payload.success) {
        setResults(payload.data || [])
        setSelectedChunks(new Set((payload.data || []).map((item: RAGResult) => item.chunk_id)))
        if (payload.query_id) {
          setQueryId(payload.query_id)
        }
      } else {
        console.error('[RAG Search] Error:', payload.error)
        alert(payload.error || 'Search failed')
      }
    } catch (error) {
      console.error('Search error', error)
      alert('Failed to run search')
    } finally {
      setLoading(false)
    }
  }

  const handleAskClaude = async () => {
    if (!query.trim() || selectedChunks.size === 0) return
    setClaudeLoading(true)
    setClaudeAnswer(null)
    try {
      const response = await fetch('/api/insight/rag-synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          chunk_ids: Array.from(selectedChunks),
        }),
      })
      const payload = await response.json()
      if (payload.success) {
        setClaudeAnswer(payload.data.answer)
        setClaudeSources(payload.data.sources || [])
      } else {
        alert(payload.error || 'Claude synthesis failed')
      }
    } catch (error) {
      console.error('Synthesis error', error)
      alert('Failed to synthesize answer')
    } finally {
      setClaudeLoading(false)
    }
  }

  const handleFeedback = async (helpful: boolean) => {
    if (!queryId) return
    try {
      const response = await fetch('/api/insight/rag-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_id: queryId, helpful }),
      })
      const payload = await response.json()
      if (!payload.success) {
        alert(payload.error || 'Failed to record feedback')
      } else {
        setFeedbackSubmitted(helpful)
      }
    } catch (error) {
      alert('Failed to submit feedback')
    }
  }

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  const filteredResults = useMemo(() => {
    const now = Date.now()
    return results.filter((result) => {
      if (timeFilter !== 'any' && result.created_at) {
        const created = new Date(result.created_at).getTime()
        if (!Number.isNaN(created)) {
          const diff = now - created
          const limit =
            timeFilter === '7d'
              ? 7 * 24 * 60 * 60 * 1000
              : timeFilter === '30d'
                ? 30 * 24 * 60 * 60 * 1000
                : 365 * 24 * 60 * 60 * 1000
          if (diff > limit) return false
        }
      }

      if (roleFilter !== 'any') {
        const scores = result.relevance_scores || {}
        const score = scores[roleFilter]
        // Only filter out if score exists and is below threshold
        // If score is null/undefined (no Claude analysis), include the result
        if (typeof score === 'number' && score < 50) {
          return false
        }
        // If score is null but roleFilter is set, include it (no Claude data available)
      }

      return true
    })
  }, [results, roleFilter, timeFilter])

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question or search semantically..."
            className="flex-1 px-4 py-3 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          />
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="any">All Profiles</option>
              <option value="dentist">Dentist</option>
              <option value="dental_assistant">Dental Assistant</option>
              <option value="hygienist">Hygienist</option>
              <option value="treatment_coordinator">Treatment Coordinator</option>
              <option value="align_rep">Align Rep</option>
            </select>
            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value as typeof timeFilter)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="any">Any time</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="365d">Last year</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : '🔍 Search'}
          </button>
        </div>
      </div>

      {filteredResults.length > 0 && selectedChunks.size > 0 && (
        <div className="mb-6 bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ask Claude</h3>
              <p className="text-sm text-gray-600">
                {selectedChunks.size} chunk{selectedChunks.size !== 1 ? 's' : ''} selected
              </p>
            </div>
            <button
              onClick={handleAskClaude}
              disabled={claudeLoading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {claudeLoading ? 'Thinking…' : '🤖 Ask Claude'}
            </button>
          </div>
        </div>
      )}

      {claudeAnswer && (
        <div className="mb-6 bg-white border border-purple-200 rounded-lg p-6 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-2">Answer</h4>
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{claudeAnswer}</div>
          {claudeSources.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Citations</h5>
              <ul className="space-y-2 text-sm text-gray-600">
                {claudeSources.map((source, index) => (
                  <li key={source.chunk_id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                    <span>
                      [{index + 1}] {source.title || 'Transcript'}{' '}
                      {source.version_label ? `• ${source.version_label}` : ''}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(source.timestamp_start)} – {formatTimestamp(source.timestamp_end)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {queryId && feedbackSubmitted === null && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleFeedback(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                👍 Helpful
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                👎 Needs work
              </button>
            </div>
          )}
          {feedbackSubmitted !== null && (
            <div className="mt-3 text-sm text-gray-500">
              Thanks for the feedback ({feedbackSubmitted ? 'marked helpful' : 'marked needs work'}).
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Searching knowledge base…</span>
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p className="text-gray-600">
              Showing {filteredResults.length} of {results.length} matches after filters
            </p>
            <p className="text-xs text-gray-500">
              Click on a chunk to exclude it from Claude&apos;s synthesis.
            </p>
          </div>

          {filteredResults.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No semantically similar results found</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting filters or rephrasing your question.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredResults.map((result) => {
                const badge = similarityBadge(result.distance)
                const topics = result.content_metadata?.topics || []
                return (
                  <div
                    key={result.chunk_id}
                    className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition border-l-4 border-purple-500"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedChunks.has(result.chunk_id)}
                          onChange={() => toggleChunkSelection(result.chunk_id)}
                          className="cursor-pointer h-5 w-5"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">
                            Semantic Match
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${badge.className}`}>
                            {badge.text}
                          </span>
                          {result.content_metadata?.content_type && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                              {result.content_metadata.content_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">{formatTimestamp(result.start_timestamp)}</span> –{' '}
                        <span>{formatTimestamp(result.end_timestamp)}</span>
                      </div>
                    </div>

                    <div className="text-gray-700 mb-4 leading-relaxed">
                      {expandedChunks.has(result.chunk_id) ? result.segment_text : `${result.segment_text.slice(0, 320)}…`}
                      <button
                        onClick={() => toggleExpanded(result.chunk_id)}
                        className="text-purple-600 hover:text-purple-800 ml-2 text-sm font-medium inline-flex items-center"
                      >
                        {expandedChunks.has(result.chunk_id) ? 'Show less' : 'Show full text'}
                      </button>
                    </div>

                    {(result.audio_file_name || result.project_name) && (
                      <div className="border-t border-gray-200 pt-3 text-xs text-gray-500">
                        <span className="font-semibold">Source:</span> {result.audio_file_name}
                        {result.project_name && <> • {result.project_name}</>}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                      {topics.length > 0 && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          Topics: {topics.join(', ')}
                        </span>
                      )}
                      {result.content_metadata?.primary_focus && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          Focus: {result.content_metadata.primary_focus}
                        </span>
                      )}
                      {result.content_metadata?.clinical_complexity && (
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          Complexity: {result.content_metadata.clinical_complexity}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {!searched && !loading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">How RAG Search Works</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Semantic Understanding:</strong> Ask questions in natural language, not just keywords.
            </li>
            <li>
              <strong>AI-Powered:</strong> Uses embeddings and a knowledge graph to surface richer context.
            </li>
            <li>
              <strong>Claude Integration:</strong> Select chunks and request a synthesized answer with citations.
            </li>
            <li>
              <strong>Video References:</strong> Every result includes precise transcript timestamps.
            </li>
            <li>
              <strong>Example Query:</strong> “How do I prepare the patient for aligner therapy?”
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}


