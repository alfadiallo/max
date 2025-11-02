'use client'

import { useState, useEffect } from 'react'
import { InfoModal } from '@/components/InfoModal'

interface InsightTranscript {
  id: string
  transcription_id: string
  text: string
  status: string
  created_at: string
  project_name?: string
  audio_file_name?: string
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

interface Chunk {
  id: string
  chunk_number: number
  timestamp_start: string
  timestamp_end: string
  duration_seconds: number
  text: string
  token_count: number
  procedures_mentioned: string[]
  tools_mentioned: string[]
  concepts_mentioned: string[]
  semantic_section: string | null
}

interface ContentOutput {
  id: string
  output_type: string
  audience: string | null
  title: string
  content: string
  status: string
  created_at: string
}

function InsightPageContent() {
  const [transcripts, setTranscripts] = useState<InsightTranscript[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedMetadata, setEditedMetadata] = useState<Partial<InsightMetadata> | null>(null)
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [loadingChunks, setLoadingChunks] = useState(false)
  const [generatingChunks, setGeneratingChunks] = useState(false)
  const [contentOutputs, setContentOutputs] = useState<ContentOutput[]>([])
  const [loadingContent, setLoadingContent] = useState(false)
  const [showChunkModal, setShowChunkModal] = useState(false)
  const [showContentModal, setShowContentModal] = useState(false)

  useEffect(() => {
    loadTranscripts()
  }, [])

  useEffect(() => {
    // Initialize edited metadata when selecting a transcript
    const selected = transcripts.find(t => t.id === selectedTranscript)
    if (selected?.metadata) {
      setEditedMetadata(selected.metadata)
      setIsEditing(false)
    }

    // Load chunks and content when a transcript is selected
    if (selected) {
      loadChunks(selected.transcription_id)
      loadContent(selected.transcription_id)
    }
  }, [selectedTranscript, transcripts])

  const loadChunks = async (transcriptionId: string) => {
    setLoadingChunks(true)
    try {
      const response = await fetch(`/api/insight/chunks?transcriptionId=${transcriptionId}`)
      const result = await response.json()
      
      if (result.success) {
        setChunks(result.data || [])
      }
    } catch (error) {
      console.error('Error loading chunks:', error)
    } finally {
      setLoadingChunks(false)
    }
  }

  const loadContent = async (transcriptionId: string) => {
    setLoadingContent(true)
    try {
      const response = await fetch(`/api/insight/content?transcriptionId=${transcriptionId}`)
      const result = await response.json()
      
      if (result.success) {
        setContentOutputs(result.data || [])
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setLoadingContent(false)
    }
  }

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

  const handleSaveMetadata = async () => {
    if (!selectedData?.metadata) return
    
    try {
      const response = await fetch('/api/insight/metadata', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightMetadataId: selectedData.metadata.id,
          metadata: editedMetadata
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setIsEditing(false)
        // Reload transcripts to show updated data
        loadTranscripts()
        alert('Metadata saved successfully')
      } else {
        alert(`Failed to save: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving metadata:', error)
      alert('Failed to save metadata')
    }
  }

  const handleApproveMetadata = async () => {
    if (!selectedData?.metadata) return
    
    try {
      const response = await fetch('/api/insight/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightMetadataId: selectedData.metadata.id,
          action: 'approve'
        })
      })
      
      const result = await response.json()
      if (result.success) {
        // Reload transcripts to show updated status
        loadTranscripts()
        alert('Metadata approved')
      } else {
        alert(`Failed to approve: ${result.error}`)
      }
    } catch (error) {
      console.error('Error approving metadata:', error)
      alert('Failed to approve metadata')
    }
  }

  const handleGenerateChunks = async () => {
    if (!selectedData) return
    
    setGeneratingChunks(true)
    try {
      const response = await fetch('/api/insight/chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionId: selectedData.transcription_id
        })
      })
      
      const result = await response.json()
      if (result.success) {
        // Reload chunks to display them immediately
        await loadChunks(selectedData.transcription_id)
        alert(`Chunking complete! Generated ${result.data.chunkCount} searchable chunks.`)
      } else {
        alert(`Failed to generate chunks: ${result.error}`)
      }
    } catch (error) {
      console.error('Error generating chunks:', error)
      alert('Failed to generate chunks')
    } finally {
      setGeneratingChunks(false)
    }
  }

  const handleGenerateContent = async () => {
    if (!selectedData) return
    
    try {
      const response = await fetch('/api/insight/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionId: selectedData.transcription_id
        })
      })
      
      const result = await response.json()
      if (result.success) {
        // Reload content to show newly generated content
        if (selectedData) {
          await loadContent(selectedData.transcription_id)
        }
        alert(`Content generation complete! Created ${result.data.totalOutputs} content pieces (${result.data.emailCount} emails, ${result.data.postCount} posts${result.data.blogGenerated ? ', 1 blog' : ''}, ${result.data.clipCount} clips)`)
      } else {
        alert(`Failed to generate content: ${result.error}`)
      }
    } catch (error) {
      console.error('Error generating content:', error)
      alert('Failed to generate content')
    }
  }

  const selectedData = transcripts.find(t => t.id === selectedTranscript)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Global header renders via RootLayout */}
      <div className="mb-6">
        <div className="flex justify-end">
          <a 
            href="/insight/search" 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            🔍 Search Transcripts
          </a>
        </div>
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
                          {transcript.audio_file_name || transcript.project_name || 'Untitled'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {transcript.project_name && (
                            <span className="text-gray-400">{transcript.project_name} • </span>
                          )}
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
                      <p className="text-gray-500">Audio File</p>
                      <p className="text-gray-900">{selectedData.audio_file_name || 'Untitled'}</p>
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

                    {/* Edit/Save controls */}
                    {isEditing && (
                      <div className="mb-4 p-4 bg-gray-50 rounded border-2 border-blue-200">
                        <h3 className="text-sm font-semibold mb-3">Reconcile Metadata</h3>
                        <p className="text-xs text-gray-600 mb-4">Edit the metadata fields below to address the ambiguities.</p>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tools & Products</label>
                            <textarea
                              value={editedMetadata?.products_or_tools?.join(', ') || ''}
                              onChange={(e) => {
                                const newMetadata = { ...editedMetadata, products_or_tools: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                                setEditedMetadata(newMetadata)
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                              placeholder="Separate with commas"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Procedures</label>
                            <textarea
                              value={editedMetadata?.procedures_discussed?.join(', ') || ''}
                              onChange={(e) => {
                                const newMetadata = { ...editedMetadata, procedures_discussed: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                                setEditedMetadata(newMetadata)
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                              placeholder="Separate with commas"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={handleSaveMetadata}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Save Changes
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Flags (if any) */}
                    {selectedData.metadata.flags && selectedData.metadata.flags.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-yellow-700">
                            ⚠️ Ambiguities Detected ({selectedData.metadata.flags.length})
                          </h3>
                          {selectedData.metadata.review_status !== 'approved' && (
                            <button
                              onClick={() => setIsEditing(!isEditing)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              {isEditing ? 'Cancel' : 'Edit & Reconcile'}
                            </button>
                          )}
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          {selectedData.metadata.flags.map((flag: any, idx: number) => (
                            <div key={idx} className="mb-2 last:mb-0 pb-2 border-b border-yellow-200 last:border-b-0">
                              <p className="text-sm font-medium text-yellow-800">{flag.field}</p>
                              <p className="text-xs text-yellow-700">{flag.issue}</p>
                              {flag.recommendation && (
                                <p className="text-xs text-yellow-600 mt-1">💡 {flag.recommendation}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Action buttons */}
                        {!isEditing && selectedData.metadata.review_status === 'needs_revision' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={handleApproveMetadata}
                              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              ✓ Approve Anyway
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generate Chunks Button */}
                    {chunks.length === 0 && (
                      <div className="mt-6 bg-white rounded-lg border border-blue-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Stage 3: Generate Chunks</h2>
                        <p className="text-sm text-gray-600 mb-4">
                          Generate searchable chunks from this transcript to enable semantic search.
                        </p>
                        {generatingChunks ? (
                          <div className="flex items-center gap-3">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            <span className="text-sm text-gray-600">Generating chunks...</span>
                          </div>
                        ) : (
                          <button
                            onClick={handleGenerateChunks}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2"
                          >
                            🔍 Generate Chunks & Embeddings
                          </button>
                        )}
                      </div>
                    )}

                    {/* Chunks Generated Success Message */}
                    {chunks.length > 0 && !generatingChunks && (
                      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">✓</span>
                          <span className="text-sm font-medium text-green-800">
                            Chunks generated successfully ({chunks.length} chunks created)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Generate Content Button */}
                    <div className="mt-6 bg-white rounded-lg border border-green-200 shadow-sm p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Stage 4: Generate Content</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Generate emails, social posts, blog outlines, and video clip specs from this transcript.
                      </p>
                      <button
                        onClick={handleGenerateContent}
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2"
                      >
                        ✨ Generate Marketing Content
                      </button>
                    </div>

                    {/* Display Chunks */}
                    {chunks.length > 0 && (
                      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <h2 className="text-lg font-semibold text-gray-900">
                            📑 Generated Chunks ({chunks.length})
                          </h2>
                          <button
                            onClick={() => setShowChunkModal(true)}
                            className="text-blue-600 hover:text-blue-700 text-lg"
                            title="View chunking criteria"
                          >
                            ℹ️
                          </button>
                        </div>
                        <div className="space-y-3">
                          {chunks.map((chunk) => (
                            <div
                              key={chunk.id}
                              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                                    Chunk {chunk.chunk_number + 1}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {chunk.timestamp_start} - {chunk.timestamp_end}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {Math.round(chunk.duration_seconds)}s
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {chunk.token_count} tokens
                                  </span>
                                </div>
                                {chunk.semantic_section && (
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                    {chunk.semantic_section}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                {chunk.text}
                              </p>

                              {(chunk.procedures_mentioned?.length > 0 || 
                                chunk.tools_mentioned?.length > 0 || 
                                chunk.concepts_mentioned?.length > 0) && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {chunk.procedures_mentioned?.map((proc, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                      {proc}
                                    </span>
                                  ))}
                                  {chunk.tools_mentioned?.map((tool, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                                      {tool}
                                    </span>
                                  ))}
                                  {chunk.concepts_mentioned?.map((concept, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                                      {concept}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Display Generated Content */}
                    {contentOutputs.length > 0 && (
                      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <h2 className="text-lg font-semibold text-gray-900">
                            ✨ Generated Marketing Content ({contentOutputs.length})
                          </h2>
                          <button
                            onClick={() => setShowContentModal(true)}
                            className="text-blue-600 hover:text-blue-700 text-lg"
                            title="View content generation criteria"
                          >
                            ℹ️
                          </button>
                        </div>
                        <div className="space-y-4">
                          {contentOutputs.map((output) => (
                            <div
                              key={output.id}
                              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded">
                                    {output.output_type.toUpperCase()}
                                  </span>
                                  {output.audience && (
                                    <span className="text-xs text-gray-500">for {output.audience}</span>
                                  )}
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">{new Date(output.created_at).toLocaleDateString()}</span>
                                </div>
                                <span className="text-xs text-gray-500">{output.status}</span>
                              </div>
                              
                              <h3 className="font-semibold text-gray-900 mb-2">{output.title}</h3>
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {output.content}
                              </div>
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

      {/* Info Modals */}
      <InfoModal
        isOpen={showChunkModal}
        onClose={() => setShowChunkModal(false)}
        title="Chunking Criteria"
        content={`CHUNKING ALGORITHM

Strategy: Accumulate Whisper segments into optimal chunks
Target Size: 500-800 tokens per chunk
Minimum Size: 400 tokens (prevents tiny chunks)

How it works:
1. Build accumulated segments with timestamps
2. Calculate token count per segment (≈4 chars per token)
3. Create new chunk when adding next segment would exceed 700 tokens
4. Maintain semantic continuity by keeping segment boundaries
5. Add metadata enrichment (procedures, tools, concepts mentioned)

This ensures:
- Searchable chunks with proper token limits
- Timestamp preservation for video navigation  
- Semantic boundaries respected
- Rich metadata for each chunk`}
      />

      <InfoModal
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        title="Content Generation Criteria"
        content={`CONTENT GENERATION PROMPT

Volume based on transcript length:
- <3,000 words: 1 email, 2 posts, 1 clip
- 3,000-5,500 words: 3 emails, 3 posts, blog outline, 2 clips
- >5,500 words: 3 emails, 5 posts, full blog, 3 clips

For each EMAIL generated:
• Subject line (compelling, benefit-focused)
• Body (200-250 words, action-oriented)
• Call-to-action (clear next step)

For each LINKEDIN/SOCIAL POST:
• Post text (150 words max for LinkedIn)
• Suggested format/style
• Key takeaway

For BLOG (if applicable):
• Structure (introduction, sections, conclusion)
• Section titles
• Estimated word count

For VIDEO CLIP SEGMENTS:
• Timestamp range
• Clip title
• Suggested visual approach
• Key message

The system extracts metadata from the transcript (learning objectives, procedures, tools, audience) and uses this to generate targeted content automatically.`}
      />
    </div>
  )
}

export default InsightPageContent
