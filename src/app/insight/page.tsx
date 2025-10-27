'use client'

import { useState, useEffect } from 'react'

interface InsightTranscript {
  id: string
  transcription_id: string
  text: string
  status: string
  created_at: string
  metadata?: InsightMetadata
  tags?: any[]
}

interface InsightMetadata {
  id: string
  learning_objectives: string[]
  procedures_discussed: string[]
  products_or_tools: string[]
  clinical_domain: string[]
  key_concepts: string[]
  target_audience: string[]
  keywords: string[]
  flags: any[]
  review_status: string
  extracted_by: string
  extraction_date: string
}

export default function InsightPage() {
  const [transcripts, setTranscripts] = useState<InsightTranscript[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null)

  useEffect(() => {
    loadTranscripts()
  }, [])

  const loadTranscripts = async () => {
    try {
      const response = await fetch('/api/insight/list')
      const result = await response.json()
      
      if (result.success) {
        setTranscripts(result.data || [])
      }
    } catch (error) {
      console.error('Error loading transcripts:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedData = transcripts.find(t => t.id === selectedTranscript)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Insight Pillar</h1>
        <p className="text-gray-600 mt-2">Review and manage instructional transcripts</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading transcripts...</span>
        </div>
      ) : transcripts.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No transcripts in Insight yet.</p>
          <p className="text-sm text-gray-500 mt-2">Go to a transcript's Final tab and click "🚀 Send to Insight"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar: List of transcripts */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Transcripts</h2>
                <p className="text-sm text-gray-500">{transcripts.length} in Insight</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {transcripts.map((transcript) => (
                  <div
                    key={transcript.id}
                    onClick={() => setSelectedTranscript(transcript.id)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                      selectedTranscript === transcript.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Transcript ID: {transcript.transcription_id.substring(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(transcript.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="ml-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          transcript.status === 'extracted' ? 'bg-green-100 text-green-800' :
                          transcript.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transcript.status}
                        </span>
                      </div>
                    </div>
                    {transcript.metadata?.review_status && (
                      <p className="text-xs text-gray-500 mt-1">
                        Review: {transcript.metadata.review_status}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side: Details and metadata */}
          <div className="lg:col-span-2">
            {!selectedData ? (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
                <p className="text-gray-500">Select a transcript to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overview */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Transcript Overview</h2>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 text-sm rounded ${
                        selectedData.status === 'extracted' ? 'bg-green-100 text-green-800' :
                        selectedData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedData.status}
                      </span>
                      <span className={`px-3 py-1 text-sm rounded ${
                        selectedData.metadata?.review_status === 'approved' ? 'bg-green-100 text-green-800' :
                        selectedData.metadata?.review_status === 'needs_revision' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedData.metadata?.review_status || 'pending'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Transcript ID</p>
                      <p className="font-mono text-gray-900">{selectedData.transcription_id.substring(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="text-gray-900">{new Date(selectedData.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Word Count</p>
                      <p className="text-gray-900">{selectedData.text.split(' ').length.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Review Status</p>
                      <p className="text-gray-900">{selectedData.metadata?.review_status || 'pending'}</p>
                    </div>
                  </div>
                </div>

                {/* Metadata Review */}
                {selectedData.metadata && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Extracted Metadata</h2>
                    
                    {/* Learning Objectives */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Learning Objectives ({selectedData.metadata.learning_objectives?.length || 0})
                      </h3>
                      <div className="bg-gray-50 rounded p-3">
                        {selectedData.metadata.learning_objectives && selectedData.metadata.learning_objectives.length > 0 ? (
                          <ul className="space-y-2">
                            {selectedData.metadata.learning_objectives.map((obj, idx) => (
                              <li key={idx} className="text-sm text-gray-700 flex items-start">
                                <span className="mr-2">•</span>
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No learning objectives extracted</p>
                        )}
                      </div>
                    </div>

                    {/* Procedures */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Procedures ({selectedData.metadata.procedures_discussed?.length || 0})
                      </h3>
                      <div className="bg-gray-50 rounded p-3">
                        {selectedData.metadata.procedures_discussed && selectedData.metadata.procedures_discussed.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedData.metadata.procedures_discussed.map((proc, idx) => (
                              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {proc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No procedures tagged</p>
                        )}
                      </div>
                    </div>

                    {/* Tools */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Tools & Products ({selectedData.metadata.products_or_tools?.length || 0})
                      </h3>
                      <div className="bg-gray-50 rounded p-3">
                        {selectedData.metadata.products_or_tools && selectedData.metadata.products_or_tools.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedData.metadata.products_or_tools.map((tool, idx) => (
                              <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                {tool}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No tools tagged</p>
                        )}
                      </div>
                    </div>

                    {/* Clinical Domains */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">
                        Clinical Domains ({selectedData.metadata.clinical_domain?.length || 0})
                      </h3>
                      <div className="bg-gray-50 rounded p-3">
                        {selectedData.metadata.clinical_domain && selectedData.metadata.clinical_domain.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedData.metadata.clinical_domain.map((domain, idx) => (
                              <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                {domain}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No domains tagged</p>
                        )}
                      </div>
                    </div>

                    {/* Flags (if any) */}
                    {selectedData.metadata.flags && selectedData.metadata.flags.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-yellow-700 mb-2">
                          ⚠️ Ambiguities Detected ({selectedData.metadata.flags.length})
                        </h3>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          {selectedData.metadata.flags.map((flag: any, idx: number) => (
                            <div key={idx} className="mb-2 last:mb-0">
                              <p className="text-sm font-medium text-yellow-800">{flag.field}</p>
                              <p className="text-xs text-yellow-700">{flag.issue}</p>
                              {flag.recommendation && (
                                <p className="text-xs text-yellow-600 mt-1">💡 {flag.recommendation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!selectedData.metadata && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600">Metadata extraction in progress or failed</p>
                    <p className="text-sm text-gray-500 mt-2">Check back in a few minutes</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
