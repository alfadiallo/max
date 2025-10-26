'use client'

import { useState, useEffect } from 'react'

interface Transcription {
  id: string
  raw_text: string
  transcription_type: string
  created_at: string
  versions?: Array<{
    id: string
    version_number: number
    version_type: string
    edited_text: string
    created_at: string
    edited_by: string
    json_with_timestamps?: {
      segments?: Array<{
        id: number
        start: number
        end: number
        text: string
      }>
      words?: Array<{
        word: string
        start: number
        end: number
      }>
      metadata?: {
        transcription_time_seconds?: number
        word_count?: number
        estimated_cost?: number
        text_length?: number
      }
    }
  }>
  json_with_timestamps?: {
    segments?: Array<{
      id: number
      start: number
      end: number
      text: string
    }>
    words?: Array<{
      word: string
      start: number
      end: number
    }>
    metadata?: {
      transcription_time_seconds?: number
      word_count?: number
      estimated_cost?: number
      text_length?: number
    }
  }
}

interface TranscriptionViewProps {
  audioFileId: string
  audioDuration?: number | null
}

export default function TranscriptionView({ audioFileId, audioDuration }: TranscriptionViewProps) {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [loading, setLoading] = useState(false)
  const [showText, setShowText] = useState(false)
  const [showExport, setShowExport] = useState<string | null>(null) // Track which transcription's export is showing
  const [editingTranscription, setEditingTranscription] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set()) // Track which versions are expanded

  const loadTranscriptions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/transcriptions?audio_file_id=${audioFileId}`)
      const result = await response.json()
      
      if (result.success) {
        setTranscriptions(result.data || [])
      }
    } catch (error) {
      console.error('Error loading transcriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showText) {
      loadTranscriptions()
    }
  }, [showText, audioFileId])

  const handleEdit = (transcriptionId: string, versionId: string) => {
    setEditingTranscription(versionId)
    // Get the transcription and find the text for this version
    const transcription = transcriptions.find(t => t.id === transcriptionId)
    if (!transcription) return
    
    // Check if this is T-1 (starts with 't1-')
    if (versionId.startsWith('t1-')) {
      // This is T-1, use raw text
      setEditedText(transcription.raw_text)
    } else {
      // This is a version, find it
      const version = transcription.versions?.find(v => v.id === versionId)
      if (version) {
        setEditedText(version.edited_text)
      }
    }
  }

  const handleSaveVersion = async (transcriptionId: string, currentEditingId: string) => {
    setSaving(true)
    try {
      const transcription = transcriptions.find(t => t.id === transcriptionId)
      const originalSegments = transcription?.json_with_timestamps?.segments || []
      
      // Update segments with edited text while preserving timestamps
      // Since edits are single-word edits, we can use simple word-by-word replacement
      const editedTextWords = editedText.split(/\s+/)
      const originalText = transcription.raw_text
      
      // Build updated segments by mapping words to segments
      let wordIndex = 0
      const updatedSegments = originalSegments.map((segment: any) => {
        const segmentWords = segment.text.trim().split(/\s+/)
        const updatedText = editedTextWords.slice(wordIndex, wordIndex + segmentWords.length).join(' ')
        wordIndex += segmentWords.length
        
        return {
          ...segment,
          text: updatedText || segment.text
        }
      })
      
      const updatedJson = {
        ...transcription?.json_with_timestamps,
        segments: updatedSegments,
        metadata: transcription?.json_with_timestamps?.metadata
      }
      
      const response = await fetch(`/api/transcriptions/${transcriptionId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_text: editedText,
          json_with_timestamps: updatedJson
        })
      })

      const result = await response.json()
      if (result.success) {
        // Reload transcriptions to show new version
        await loadTranscriptions()
        setEditingTranscription(null)
        alert('Version saved successfully!')
      } else {
        alert(`Failed to save version: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error saving version: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingTranscription(null)
    setEditedText('')
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowText(!showText)}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        {showText ? 'Hide' : 'View'} Transcription
        {transcriptions.length > 0 && ` (${transcriptions.length})`}
      </button>
      
      {showText && (
        <div className="mt-2 bg-gray-50 rounded-lg p-4">
          {loading ? (
            <p className="text-sm text-gray-600">Loading transcription...</p>
          ) : transcriptions.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No transcription yet</p>
          ) : (
            <div className="space-y-2">
              {transcriptions.map((transcription) => {
                const metadata = transcription.json_with_timestamps?.metadata
                
                // Build all versions array: T-1 first, then H-1, H-2, etc. in order
                const allVersions = [
                  {
                    id: `t1-${transcription.id}`,
                    transcriptionId: transcription.id,
                    type: transcription.transcription_type,
                    text: transcription.raw_text,
                    created_at: transcription.created_at,
                    segments: transcription.json_with_timestamps?.segments || [],
                    metadata: metadata,
                    isLatest: false,
                    canEdit: false
                  },
                  ...(transcription.versions || [])
                    .sort((a, b) => a.version_number - b.version_number)
                    .map((v) => ({
                      id: v.id,
                      transcriptionId: transcription.id,
                      type: v.version_type,
                      text: v.edited_text,
                      created_at: v.created_at,
                      segments: v.json_with_timestamps?.segments || transcription.json_with_timestamps?.segments || [],
                      metadata: metadata,
                      isLatest: false,
                      canEdit: false
                    }))
                ]
                
                // Mark the latest version and reverse so most recent is first
                if (allVersions.length > 0) {
                  allVersions[allVersions.length - 1].isLatest = true
                  allVersions[allVersions.length - 1].canEdit = true
                }
                
                // Reverse array so latest (H-2, H-1, etc.) appears first
                allVersions.reverse()
                
                // Helper functions for collapse/expand (first one is latest after reverse)
                const latestVersionId = allVersions[0]?.id
                const isExpanded = (versionId: string) => {
                  if (expandedVersions.size === 0) {
                    return versionId === latestVersionId
                  }
                  return expandedVersions.has(versionId)
                }
                
                const toggleVersion = (versionId: string) => {
                  const newExpanded = new Set(expandedVersions)
                  if (newExpanded.has(versionId)) {
                    newExpanded.delete(versionId)
                  } else {
                    newExpanded.add(versionId)
                  }
                  setExpandedVersions(newExpanded)
                }
                
                return (
                  <div key={transcription.id} className="space-y-2">
                    {allVersions.map((version) => {
                      const versionIsExpanded = isExpanded(version.id)
                      const hasTimestamps = version.segments.length > 0
                      const versionIsEditing = editingTranscription === version.id
                      
                      return (
                        <div key={version.id} className="border border-gray-200 rounded-lg">
                          {/* Version Header - Collapsible */}
                          <button
                            onClick={() => toggleVersion(version.id)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{versionIsExpanded ? '▼' : '▶'}</span>
                              <div className="text-left">
                                <p className="text-sm font-semibold">{version.type}</p>
                                <p className="text-xs text-gray-500">{new Date(version.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            {!versionIsEditing && hasTimestamps && (
                              <span className="text-xs text-green-600 font-medium">🎬 Has timestamps</span>
                            )}
                          </button>
                          
                          {/* Version Content - Collapsed */}
                          {versionIsExpanded && (
                            <div className="px-4 pb-4 space-y-3">
                              {/* Edit Button - only for latest version */}
                              {version.canEdit && !versionIsEditing && (
                                <button
                                  onClick={() => handleEdit(version.transcriptionId, version.id)}
                                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Edit
                                </button>
                              )}
                              
                              {/* Metadata Box */}
                              {version.metadata && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                    {audioDuration !== null && audioDuration !== undefined && (
                                      <div>
                                        <span className="text-blue-600 font-medium">Audio length: </span>
                                        <span className="text-gray-700 font-bold">{formatTime(audioDuration)}</span>
                                      </div>
                                    )}
                                    {version.metadata.transcription_time_seconds !== undefined && (
                                      <div>
                                        <span className="text-blue-600 font-medium">Time to transcribe: </span>
                                        <span className="text-gray-700 font-bold">{version.metadata.transcription_time_seconds}s</span>
                                      </div>
                                    )}
                                    {version.metadata.word_count !== undefined && (
                                      <div>
                                        <span className="text-blue-600 font-medium">Words: </span>
                                        <span className="text-gray-700 font-bold">{version.metadata.word_count.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {version.metadata.text_length !== undefined && (
                                      <div>
                                        <span className="text-blue-600 font-medium">Characters: </span>
                                        <span className="text-gray-700 font-bold">{version.metadata.text_length.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {version.metadata.estimated_cost !== undefined && (
                                      <div>
                                        <span className="text-blue-600 font-medium">Est. Cost: </span>
                                        <span className="text-gray-700 font-bold">${version.metadata.estimated_cost.toFixed(4)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Export Button for Video Dubbing */}
                              {hasTimestamps && version.segments.length > 0 && (
                                <div>
                                  <button
                                    onClick={() => setShowExport(showExport === version.id ? null : version.id)}
                                    className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                  >
                                    {showExport === version.id ? 'Hide' : 'Show'} Dubbing Script Format
                                  </button>
                                  {showExport === version.id && (
                                    <div className="mt-2 bg-purple-50 border border-purple-200 rounded p-3 max-h-64 overflow-y-auto">
                                      <pre className="whitespace-pre-wrap text-xs font-mono">
                                        {version.segments.map(seg => `[${formatTime(seg.start)}-${formatTime(seg.end)}]\n${seg.text}\n`).join('\n')}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Editing Interface */}
                              {versionIsEditing ? (
                                <div>
                                  <textarea
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm leading-relaxed"
                                    rows={10}
                                    placeholder="Edit transcription text..."
                                  />
                                  <div className="flex gap-2 mt-3">
                                    <button
                                      onClick={() => handleSaveVersion(version.transcriptionId, editingTranscription || '')}
                                      disabled={saving}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                                    >
                                      {saving ? 'Saving...' : 'Save Version'}
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      disabled={saving}
                                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm disabled:opacity-50"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Display mode - Always show full text */
                                <div className="bg-white p-3 rounded border border-gray-200">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {version.text}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
