'use client'

import { useState } from 'react'
import Link from 'next/link'
import React from 'react'

interface SearchResult {
  id: string
  text: string
  timestamp_start: string
  timestamp_end: string
  timestamp_start_seconds: number
  timestamp_end_seconds: number
  procedures_mentioned?: string[]
  tools_mentioned?: string[]
  concepts_mentioned?: string[]
  semantic_section?: string
  similarity?: number
  audio_file_name?: string
  project_name?: string
  insight_transcripts?: {
    transcription_id: string
    transcription?: {
      audio?: {
        file_name: string
        project?: {
          name: string
        }
      }
    }
  }
}

export default function InsightSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set())

  // Helper function to highlight search terms in text
  const highlightText = (text: string, searchTerm: string): React.ReactNode => {
    if (!searchTerm.trim()) return text

    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    )
  }

  // Helper function to show context around search term
  const getContextAroundTerm = (text: string, searchTerm: string, contextLength: number = 150): string => {
    if (!searchTerm.trim()) {
      // If no search term, just truncate at the beginning
      return text.length > contextLength ? '...' + text.substring(text.length - contextLength) : text
    }

    // Find the first occurrence of the search term (case insensitive)
    const lowerText = text.toLowerCase()
    const lowerTerm = searchTerm.toLowerCase()
    const index = lowerText.indexOf(lowerTerm)

    if (index === -1) {
      // Term not found, just truncate
      return text.length > contextLength * 2 ? '...' + text.substring(0, contextLength * 2) + '...' : text
    }

    // Calculate start and end positions for context
    const start = Math.max(0, index - contextLength)
    const end = Math.min(text.length, index + searchTerm.length + contextLength)

    let result = ''
    if (start > 0) result += '...'
    result += text.substring(start, end)
    if (end < text.length) result += '...'

    return result
  }

  const toggleExpanded = (chunkId: string) => {
    const newExpanded = new Set(expandedChunks)
    if (newExpanded.has(chunkId)) {
      newExpanded.delete(chunkId)
    } else {
      newExpanded.add(chunkId)
    }
    setExpandedChunks(newExpanded)
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)

    try {
      const response = await fetch(`/api/insight/search?query=${encodeURIComponent(query)}`)
      const result = await response.json()

      if (result.success) {
        setResults(result.data)
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Transcripts</h1>
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 inline-block mb-4">
          ← Back to Dashboard
        </Link>
        <p className="text-gray-600">Search across all your transcripts using exact text matching</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for topics, procedures, tools, concepts..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Searching...</span>
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="mb-4">
            <p className="text-gray-600">Found {results.length} result{results.length !== 1 ? 's' : ''}</p>
          </div>

          {results.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No results found</p>
              <p className="text-sm text-gray-500 mt-2">Try different keywords or check for spelling errors</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                        {result.semantic_section || 'General'}
                      </span>
                      {result.procedures_mentioned && result.procedures_mentioned.length > 0 && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                          Procedure
                        </span>
                      )}
                      {result.tools_mentioned && result.tools_mentioned.length > 0 && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-800">
                          Tool
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">{result.timestamp_start}</span> - <span>{result.timestamp_end}</span>
                      <span className="ml-2 text-xs">
                        ({formatTimestamp(result.timestamp_start_seconds)} - {formatTimestamp(result.timestamp_end_seconds)})
                      </span>
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="text-gray-700 mb-4 leading-relaxed">
                    {expandedChunks.has(result.id) ? (
                      <>{highlightText(result.text, query)}</>
                    ) : (
                      <>{highlightText(getContextAroundTerm(result.text, query), query)}</>
                    )}
                    {!expandedChunks.has(result.id) && (
                      <button
                        onClick={() => toggleExpanded(result.id)}
                        className="text-blue-600 hover:text-blue-800 ml-2 text-sm font-medium"
                      >
                        Show full text
                      </button>
                    )}
                    {expandedChunks.has(result.id) && (
                      <button
                        onClick={() => toggleExpanded(result.id)}
                        className="text-blue-600 hover:text-blue-800 ml-2 text-sm font-medium block mt-2"
                      >
                        Show less
                      </button>
                    )}
                  </div>

                  {/* Metadata */}
                  {(result.procedures_mentioned || result.tools_mentioned || result.concepts_mentioned) && (
                    <div className="border-t border-gray-200 pt-3 flex gap-4 text-sm text-gray-600">
                      {result.procedures_mentioned && result.procedures_mentioned.length > 0 && (
                        <div>
                          <span className="font-semibold">Procedures:</span>{' '}
                          {result.procedures_mentioned.join(', ')}
                        </div>
                      )}
                      {result.tools_mentioned && result.tools_mentioned.length > 0 && (
                        <div>
                          <span className="font-semibold">Tools:</span>{' '}
                          {result.tools_mentioned.join(', ')}
                        </div>
                      )}
                      {result.concepts_mentioned && result.concepts_mentioned.length > 0 && (
                        <div>
                          <span className="font-semibold">Concepts:</span>{' '}
                          {result.concepts_mentioned.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source Info */}
                  {(result.audio_file_name || result.insight_transcripts?.transcription?.audio) && (
                    <div className="border-t border-gray-200 pt-3 mt-3 text-xs text-gray-500">
                      <span className="font-semibold">Source:</span>{' '}
                      {result.audio_file_name || result.insight_transcripts?.transcription?.audio?.file_name}
                      {result.project_name || result.insight_transcripts?.transcription?.audio?.project?.name && (
                        <> • {result.project_name || result.insight_transcripts.transcription.audio.project.name}</>
                      )}
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Search</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Enter exact keywords or phrases you want to find</li>
            <li>Search looks for exact text matches (case-insensitive)</li>
            <li>Results show chunks that contain your search terms</li>
            <li>Use quotes for exact phrase matching</li>
            <li>Click timestamps to jump to specific video segments</li>
          </ul>
        </div>
      )}
    </div>
  )
}

