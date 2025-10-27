'use client'

import { useState, useEffect } from 'react'
import { ANALYSIS_USER_PROMPT } from '@/lib/prompts/transcription-analysis'

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
  const [showExport, setShowExport] = useState<string | null>(null)
  const [editingTranscription, setEditingTranscription] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'transcription' | 'final' | 'analysis'>('transcription')
  const [finalVersion, setFinalVersion] = useState<string | null>(null) // ID of the promoted final version
  const [analysis, setAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showAnalysisInfo, setShowAnalysisInfo] = useState(false)

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

  const handlePromoteToFinal = (versionId: string) => {
    setFinalVersion(versionId)
    setActiveTab('final')
  }

  const handleAnalyze = async (transcriptionId: string) => {
    setAnalyzing(true)
    try {
      const response = await fetch(`/api/transcriptions/${transcriptionId}/analyze`, {
        method: 'POST'
      })
      const result = await response.json()
      
      if (result.success) {
        setAnalysis(result.data)
        setActiveTab('analysis')
        alert('Analysis complete!')
      } else {
        alert(`Analysis failed: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error analyzing: ${error.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const loadAnalysis = async (transcriptionId: string) => {
    try {
      const response = await fetch(`/api/transcriptions/${transcriptionId}/analyze`)
      const result = await response.json()
      if (result.success) {
        setAnalysis(result.data)
      }
    } catch (error) {
      console.error('Error loading analysis:', error)
    }
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
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-300">
            <button
              onClick={() => setActiveTab('transcription')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'transcription'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Transcription
            </button>
            <button
              onClick={() => setActiveTab('final')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'final'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Final {finalVersion && '✓'}
            </button>
            <button
              onClick={() => {
                setActiveTab('analysis')
                if (transcriptions.length > 0 && !analysis) {
                  loadAnalysis(transcriptions[0].id)
                }
              }}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'analysis'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Analysis {analysis && '✓'}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'transcription' && (
            <>
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
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEdit(version.transcriptionId, version.id)}
                                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handlePromoteToFinal(version.id)}
                                        className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                      >
                                        Promote to Final
                                      </button>
                                    </div>
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
            </>
          )}

          {activeTab === 'final' && (
            <div className="space-y-4">
              {!finalVersion && (
                <p className="text-sm text-gray-600 italic text-center py-8">
                  No final version selected. Go to the <span className="font-medium">Transcription</span> tab and click "Promote to Final" on a version.
                </p>
              )}
              {finalVersion && transcriptions.map((transcription) => {
                let finalVersionObj = null
                
                if (finalVersion.startsWith('t1-') && finalVersion.includes(transcription.id)) {
                  // Final is T-1
                  finalVersionObj = {
                    id: finalVersion,
                    type: transcription.transcription_type,
                    text: transcription.raw_text,
                    segments: transcription.json_with_timestamps?.segments || [],
                    metadata: transcription.json_with_timestamps?.metadata
                  }
                } else if (transcription.versions?.some(v => v.id === finalVersion)) {
                  // Final is a version
                  const version = transcription.versions.find(v => v.id === finalVersion)
                  finalVersionObj = {
                    id: finalVersion,
                    type: version.version_type,
                    text: version.edited_text,
                    segments: version.json_with_timestamps?.segments || [],
                    metadata: transcription.json_with_timestamps?.metadata
                  }
                }
                
                if (!finalVersionObj) return null
                
                return (
                  <div key={transcription.id} className="bg-white p-4 rounded border border-green-300">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-green-700">✓ {finalVersionObj.type} - Final Version</h3>
                      <button
                        onClick={() => handleAnalyze(transcription.id)}
                        disabled={analyzing}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                      >
                        {analyzing ? 'Analyzing...' : 'Send for Analysis'}
                      </button>
                    </div>
                    
                    {/* Show Dubbing Script Format button */}
                    {finalVersionObj.segments.length > 0 && (
                      <div className="mb-3">
                        <button
                          onClick={() => setShowExport(showExport === finalVersionObj.id ? null : finalVersionObj.id)}
                          className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          {showExport === finalVersionObj.id ? 'Hide' : 'Show'} Dubbing Script Format
                        </button>
                      </div>
                    )}
                    
                    {/* Dubbing Script Display */}
                    {showExport === finalVersionObj.id && finalVersionObj.segments.length > 0 && (
                      <div className="mb-3 bg-purple-50 border border-purple-200 rounded p-3 max-h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-xs font-mono">
                          {finalVersionObj.segments.map(seg => `[${formatTime(seg.start)}-${formatTime(seg.end)}]\n${seg.text}\n`).join('\n')}
                        </pre>
                      </div>
                    )}
                    
                    {/* Full Text Display */}
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{finalVersionObj.text}</p>
                    </div>
                  </div>
                )
              })}
              
              {finalVersion && !transcriptions.some(t => 
                finalVersion.startsWith('t1-') && finalVersion.includes(t.id) ||
                t.versions?.some(v => v.id === finalVersion)
              ) && (
                <p className="text-sm text-gray-600 italic">No matching version found.</p>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-4">
              {analyzing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-sm text-gray-600">Analyzing content with Claude...</span>
                </div>
              ) : analysis ? (
                <div className="bg-white p-4 rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold">Content Analysis</h3>
                    <button
                      onClick={() => setShowAnalysisInfo(!showAnalysisInfo)}
                      className="relative"
                      title="Analysis Instructions"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Info Popup */}
                  {showAnalysisInfo && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAnalysisInfo(false)}>
                      <div className="bg-white p-6 rounded-lg max-w-2xl max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Analysis Instructions</h3>
                          <button onClick={() => setShowAnalysisInfo(false)} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-sm space-y-2">
                          <div>
                            <p className="font-medium mb-1">1. CONTENT_TYPE:</p>
                            <p className="text-gray-600">The primary category (Tutorial, Presentation, Interview, Marketing, Entertainment, Educational, Product Demo, Meeting, Training)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">2. THEMATIC_TAGS:</p>
                            <p className="text-gray-600">An array of 3-5 key themes or topics (e.g., ["Healthcare", "Emergency Medicine", "Continuing Education"])</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">3. KEY_CONCEPTS:</p>
                            <p className="text-gray-600">An array of the main concepts covered (e.g., ["CT Utilization", "Clinical Decision Making", "Patient Care"])</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">4. TARGET_AUDIENCE:</p>
                            <p className="text-gray-600">Who is the primary audience? (Healthcare Providers, Emergency Physicians, Medical Students, General Public)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">5. TONE:</p>
                            <p className="text-gray-600">The overall tone and style (Professional, Casual, Technical, Conversational, Educational)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">6. DURATION_CATEGORY:</p>
                            <p className="text-gray-600">How long is this content? (Short - under 5 min, Medium - 5-15 min, Long - 15+ min)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">7. LANGUAGE_STYLE:</p>
                            <p className="text-gray-600">The complexity of language used (Technical/Jargon-Heavy, Moderate, Simple/Layperson-Friendly)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1">8. SUMMARY:</p>
                            <p className="text-gray-600">A brief 2-3 sentence summary of the content</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {analysis.content_type && (
                      <div>
                        <span className="text-xs font-medium text-gray-600">Content Type: </span>
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{analysis.content_type}</span>
                      </div>
                    )}
                    
                    {analysis.thematic_tags && analysis.thematic_tags.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-600">Themes: </span>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {analysis.thematic_tags.map((tag: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {analysis.key_concepts && analysis.key_concepts.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-600">Key Concepts:</span>
                        <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                          {analysis.key_concepts.map((concept: string, idx: number) => (
                            <li key={idx}>{concept}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.target_audience && (
                      <div>
                        <span className="text-xs font-medium text-gray-600">Target Audience: </span>
                        <span className="text-sm">{analysis.target_audience}</span>
                      </div>
                    )}
                    
                    {analysis.tone && (
                      <div>
                        <span className="text-xs font-medium text-gray-600">Tone: </span>
                        <span className="text-sm">{analysis.tone}</span>
                      </div>
                    )}
                    
                    {analysis.summary && (
                      <div className="border-t border-gray-200 pt-3 mt-3">
                        <span className="text-xs font-medium text-gray-600">Summary:</span>
                        <p className="text-sm text-gray-700 mt-1">{analysis.summary}</p>
                      </div>
                    )}
                  </div>

                  {/* Dubbing Script and Complete Transcript */}
                  <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                    {transcriptions.map((transcription) => {
                      let finalVersionObj = null
                      
                      if (finalVersion && finalVersion.startsWith('t1-') && finalVersion.includes(transcription.id)) {
                        finalVersionObj = {
                          id: finalVersion,
                          type: transcription.transcription_type,
                          text: transcription.raw_text,
                          segments: transcription.json_with_timestamps?.segments || [],
                          metadata: transcription.json_with_timestamps?.metadata
                        }
                      } else if (finalVersion && transcription.versions?.some(v => v.id === finalVersion)) {
                        const version = transcription.versions.find(v => v.id === finalVersion)
                        finalVersionObj = {
                          id: finalVersion,
                          type: version.version_type,
                          text: version.edited_text,
                          segments: version.json_with_timestamps?.segments || [],
                          metadata: transcription.json_with_timestamps?.metadata
                        }
                      }
                      
                      if (!finalVersionObj) return null
                      
                      return (
                        <div key={transcription.id} className="space-y-3">
                          {/* Dubbing Script Format */}
                          {finalVersionObj.segments.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-gray-700">Dubbing Script Format</h4>
                              </div>
                              <div className="bg-purple-50 border border-purple-200 rounded p-3 max-h-48 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-xs font-mono">
                                  {finalVersionObj.segments.map(seg => `[${formatTime(seg.start)}-${formatTime(seg.end)}]\n${seg.text}\n`).join('\n')}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {/* Complete Transcript */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-gray-700">Complete Transcript</h4>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-48 overflow-y-auto">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{finalVersionObj.text}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 italic">No analysis yet. Promote a version to final and click "Send for Analysis".</p>
              )}
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
