'use client'

import { useState } from 'react'
import Link from 'next/link'
import React from 'react'

interface RAGResult {
  chunk_id: string
  source_id: string | null
  version_id: string | null
  chunk_text: string
  start_timestamp: string | null
  end_timestamp: string | null
  distance: number
  audio_file_name?: string | null
  project_name?: string | null
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

  const toggleExpanded = (chunkId: string) => {
    const newExpanded = new Set(expandedChunks)
    if (newExpanded.has(chunkId)) {
      newExpanded.delete(chunkId)
    } else {
      newExpanded.add(chunkId)
    }
    setExpandedChunks(newExpanded)
  }

  const toggleChunkSelection = (chunkId: string) => {
    const newSelected = new Set(selectedChunks)
    if (newSelected.has(chunkId)) {
      newSelected.delete(chunkId)
    } else {
      newSelected.add(chunkId)
    }
    setSelectedChunks(newSelected)
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)
    setResults([])
    setSelectedChunks(new Set())
    setClaudeAnswer(null)

    try {
      const response = await fetch('/api/insight/rag-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10 })
      })
      
      const result = await response.json()

      if (result.success) {
        setResults(result.data || [])
        // Auto-select all results by default
        setSelectedChunks(new Set(result.data.map((r: RAGResult) => r.chunk_id)))
      } else {
        alert(`Search failed: ${result.error}`)
        setResults([])
      }
    } catch (error) {
      console.error('Error searching:', error)
      alert('Failed to search')
      setResults([])
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
          chunk_ids: Array.from(selectedChunks)
        })
      })
      
      const result = await response.json()

      if (result.success) {
        setClaudeAnswer(result.data.answer)
      } else {
        alert(`Claude synthesis failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error synthesizing:', error)
      alert('Failed to synthesize answer')
    } finally {
      setClaudeLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getSimilarityColor = (distance: number) => {
    if (distance < 0.2) return 'text-green-600 bg-green-50'
    if (distance < 0.4) return 'text-blue-600 bg-blue-50'
    if (distance < 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Global header renders via RootLayout */}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question or search semantically..."
            className="flex-1 px-4 py-3 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : '🔍 Search'}
          </button>
        </div>
      </div>

      {/* Claude Synthesis */}
      {results.length > 0 && selectedChunks.size > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
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
              {claudeLoading ? 'Thinking...' : '🤖 Ask Claude'}
            </button>
          </div>
          
          {claudeAnswer && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-2">Claude's Answer:</h4>
              <div className="text-gray-700 whitespace-pre-wrap">{claudeAnswer}</div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Searching knowledge base...</span>
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="mb-4">
            <p className="text-gray-600">
              Found {results.length} semantically relevant result{results.length !== 1 ? 's' : ''}
            </p>
          </div>

          {results.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No semantically similar results found</p>
              <p className="text-sm text-gray-500 mt-2">
                Try rephrasing your query or use different keywords
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.chunk_id}
                  className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition border-l-4 border-purple-500"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedChunks.has(result.chunk_id)}
                        onChange={() => toggleChunkSelection(result.chunk_id)}
                        className="cursor-pointer h-5 w-5"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">
                          Semantic Match
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getSimilarityColor(result.distance)}`}>
                          Similarity: {(1 - result.distance).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">{result.start_timestamp ?? '—'}</span> - <span>{result.end_timestamp ?? '—'}</span>
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="text-gray-700 mb-4 leading-relaxed">
                    {expandedChunks.has(result.chunk_id) ? (
                      <>{result.chunk_text}</>
                    ) : (
                      <>{result.chunk_text.substring(0, 300)}...</>
                    )}
                    {!expandedChunks.has(result.chunk_id) && (
                      <button
                        onClick={() => toggleExpanded(result.chunk_id)}
                        className="text-purple-600 hover:text-purple-800 ml-2 text-sm font-medium"
                      >
                        Show full text
                      </button>
                    )}
                    {expandedChunks.has(result.chunk_id) && (
                      <button
                        onClick={() => toggleExpanded(result.chunk_id)}
                        className="text-purple-600 hover:text-purple-800 ml-2 text-sm font-medium block mt-2"
                      >
                        Show less
                      </button>
                    )}
                  </div>

                  {/* Source Info */}
                  {(result.audio_file_name || result.project_name) && (
                    <div className="border-t border-gray-200 pt-3 text-xs text-gray-500">
                      <span className="font-semibold">Source:</span>{' '}
                      {result.audio_file_name}
                      {result.project_name && <> • {result.project_name}</>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Info section when no search performed yet */}
      {!searched && !loading && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">How RAG Search Works</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              <strong>Semantic Understanding:</strong> Ask questions in natural language, not just keywords
            </li>
            <li>
              <strong>AI-Powered:</strong> Uses OpenAI embeddings and pgvector for intelligent matching
            </li>
            <li>
              <strong>Claude Integration:</strong> Get synthesized answers from selected chunks
            </li>
            <li>
              <strong>Video References:</strong> Every result includes timestamp links for easy navigation
            </li>
            <li>
              <strong>Example Query:</strong> "How do I perform alignment for a patient?" instead of just "alignment"
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

