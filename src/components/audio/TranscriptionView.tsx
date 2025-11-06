'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ANALYSIS_USER_PROMPT } from '@/lib/prompts/transcription-analysis'
import { computeTextDiff } from '@/lib/utils/textDiff'

interface Transcription {
  id: string
  raw_text: string
  transcription_type: string
  created_at: string
  final_version_id?: string | null
  versions?: Array<{
    id: string
    version_number: number
    version_type: string
    edited_text: string
    created_at: string
    edited_by: string
    dictionary_corrections_applied?: Array<{
      original_text: string
      corrected_text: string
      position_start: number
      position_end: number
    }> | null
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
  const [editingTranscription, setEditingTranscription] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')
  const [editingSegments, setEditingSegments] = useState<any[]>([])
  const [initialSegments, setInitialSegments] = useState<any[]>([]) // Store initial state for comparison
  const [saving, setSaving] = useState(false)
  const [editedSegmentIndices, setEditedSegmentIndices] = useState<Set<number>>(new Set())
  const [currentEditedIndex, setCurrentEditedIndex] = useState<number | null>(null)
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findReplaceVersion, setFindReplaceVersion] = useState<any>(null)
  const [findTerm, setFindTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [findReplaceResults, setFindReplaceResults] = useState<any[]>([])
  const [selectedFindReplace, setSelectedFindReplace] = useState<Set<number>>(new Set())
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'original' | 'edits' | 'text-translations' | 'speech-translations' | 'final' | 'analysis' | 'translations'>('original')
  const supabase = createClient()
  
  // Check if user is Editor (restricted access)
  const isEditor = user?.user_metadata?.role === 'Editor' || user?.user_metadata?.role === 'editor'
  const [finalVersion, setFinalVersion] = useState<string | null>(null) // ID of the promoted final version
  const [analysis, setAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showAnalysisInfo, setShowAnalysisInfo] = useState(false)
  const [translations, setTranslations] = useState<any[]>([])
  const [generatingTranslation, setGeneratingTranslation] = useState<string | null>(null) // language_code being generated
  const [editingTranslation, setEditingTranslation] = useState<string | null>(null) // translation_id being edited
  const [editedTranslationText, setEditedTranslationText] = useState('')
  const [editedTranslationSegments, setEditedTranslationSegments] = useState<any[]>([])
  const [savingTranslation, setSavingTranslation] = useState(false)
  const [generatedSpeech, setGeneratedSpeech] = useState<any[]>([]) // Array of generated speech files
  const [generatingSpeech, setGeneratingSpeech] = useState<string | null>(null) // translation_id being generated
  const [speechLoaded, setSpeechLoaded] = useState(false) // Whether speech files have been loaded
  const [translationsLoaded, setTranslationsLoaded] = useState(false) // Whether translations have been loaded
  const [sendingToInsight, setSendingToInsight] = useState(false) // Whether sending to Insight
  const [sentToInsight, setSentToInsight] = useState<string | null>(null) // transcription_id that was sent
  const [sendingToRAG, setSendingToRAG] = useState<string | null>(null) // transcription_id being sent to RAG
  const [selectedLanguageForEdit, setSelectedLanguageForEdit] = useState<string | null>(null) // language_code for text-translations tab
  const [editingTextTranslation, setEditingTextTranslation] = useState<string | null>(null) // translation_id being edited in text-translations tab

  const loadTranscriptions = async () => {
    setLoading(true)
    try {
      console.log('Loading transcriptions for audio_file_id:', audioFileId)
      const response = await fetch(`/api/transcriptions?audio_file_id=${audioFileId}`)
      const result = await response.json()
      
      console.log('Transcriptions API response:', result)
      
      if (result.success) {
        console.log('Transcriptions loaded:', result.data?.length || 0, 'transcriptions')
        setTranscriptions(result.data || [])
        // Load the final version if it exists
        if (result.data && result.data.length > 0) {
          const transcription = result.data[0]
          // final_version_id: string = a version is final, null = T-1 is final, undefined = no final
          if (transcription.final_version_id !== undefined) {
            if (transcription.final_version_id === null) {
              // null means T-1 is the final version
              setFinalVersion(`t1-${transcription.id}`)
            } else {
              // A version ID means that version is final
              setFinalVersion(transcription.final_version_id)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading transcriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get current user
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset activeTab if Editor tries to access restricted tabs
  useEffect(() => {
    if (isEditor && (activeTab === 'final' || activeTab === 'analysis' || activeTab === 'translations' || activeTab === 'text-translations' || activeTab === 'speech-translations')) {
      setActiveTab('original')
    }
  }, [isEditor, activeTab])

  useEffect(() => {
    if (showText) {
      loadTranscriptions()
    }
  }, [showText, audioFileId])

  // Live search effect - update results as you type
  useEffect(() => {
    if (!showFindReplace || !findTerm.trim() || !findReplaceVersion) {
      setFindReplaceResults([])
      setSelectedFindReplace(new Set())
      return
    }

    const results: any[] = []
    const segments = findReplaceVersion.segments || []
    
    // Search through all segments
    segments.forEach((seg: any, idx: number) => {
      // Case-insensitive search
      const lowerText = seg.text.toLowerCase()
      const lowerFind = findTerm.toLowerCase()
      
      if (lowerText.includes(lowerFind)) {
        // Get the replacement preview
        const replacePreview = seg.text.replace(new RegExp(findTerm, 'gi'), replaceTerm)
        
        results.push({
          segmentIndex: idx,
          segment: seg,
          originalText: seg.text,
          replacementText: replacePreview,
          context: seg.text,
          checked: true
        })
      }
    })
    
    setFindReplaceResults(results)
    // Auto-select all by default
    setSelectedFindReplace(new Set(results.map((_, idx) => idx)))
  }, [findTerm, replaceTerm, findReplaceVersion, showFindReplace])

  const handleEdit = (transcriptionId: string, versionId: string) => {
    setEditingTranscription(versionId)
    // Get the transcription and find the segments for this version
    const transcription = transcriptions.find(t => t.id === transcriptionId)
    if (!transcription) return
    
    // Always get the T-1 segments as the reference (original on left)
    const t1Segments = transcription.json_with_timestamps?.segments || []
    
    // Check if this is T-1 (starts with 't1-')
    if (versionId.startsWith('t1-')) {
      // This is T-1, use its own segments
      const segments = t1Segments.map((seg: any) => ({ ...seg }))
      setInitialSegments(segments.map((seg: any) => ({ ...seg }))) // Store initial state
      setEditingSegments(segments)
      setEditedText(transcription.raw_text)
      updateEditedSegments(segments) // Initialize - no edits at start
    } else {
      // This is a version, get its segments if they exist
      const version = transcription.versions?.find(v => v.id === versionId)
      if (version) {
        const versionSegments = version.json_with_timestamps?.segments
        let segments
        if (versionSegments && versionSegments.length > 0) {
          segments = versionSegments.map((seg: any) => ({ ...seg }))
        } else {
          // Fallback to T-1 segments if version has no segments
          segments = t1Segments.map((seg: any) => ({ ...seg }))
        }
        setInitialSegments(segments.map((seg: any) => ({ ...seg }))) // Store initial state
        setEditingSegments(segments)
        setEditedText(version.edited_text)
        updateEditedSegments(segments) // Initialize - detect existing edits
      }
    }
    setCurrentEditedIndex(null) // Reset current position
  }

  const handleSaveVersion = async (transcriptionId: string, currentEditingId: string) => {
    setSaving(true)
    try {
      const transcription = transcriptions.find(t => t.id === transcriptionId)
      
      // Build the updated JSON with edited segments
      const updatedJson = {
        ...transcription?.json_with_timestamps,
        segments: editingSegments,
        metadata: transcription?.json_with_timestamps?.metadata
      }
      
      // Collect actual edits made during this session (only segments user explicitly changed)
      // Compute minimal text diff to show only what changed, not the entire segment
      const actualEdits: any[] = []
      editedSegmentIndices.forEach(idx => {
        const editedSeg = editingSegments[idx]
        const initialSeg = initialSegments[idx]
        if (editedSeg && initialSeg && editedSeg.text !== initialSeg.text) {
          // Compute the minimal diff (only the changed words)
          const diff = computeTextDiff(initialSeg.text, editedSeg.text, 2)
          
          actualEdits.push({
            original_text: diff.original_text || initialSeg.text, // Fallback to full text if diff is empty
            corrected_text: diff.corrected_text || editedSeg.text,
            position_start: editedSeg.start,
            position_end: editedSeg.end,
            context_before: diff.context_before,
            context_after: diff.context_after
          })
        }
      })
      
      const response = await fetch(`/api/transcriptions/${transcriptionId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json_with_timestamps: updatedJson,
          actual_edits: actualEdits
          // Note: edited_text will be generated from segments by the API
        })
      })

      const result = await response.json()
      if (result.success) {
        // Reload transcriptions to show new version
        await loadTranscriptions()
        setEditingTranscription(null)
        setEditingSegments([])
        setInitialSegments([])
        setEditedText('')
        setEditedSegmentIndices(new Set())
        setCurrentEditedIndex(null)
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
    setEditingSegments([])
    setInitialSegments([])
    setEditedSegmentIndices(new Set())
    setCurrentEditedIndex(null)
  }

  // Helper function to update edited segment tracking (compare against initial state)
  const updateEditedSegments = (segments: any[]) => {
    const editedIndices = new Set<number>()
    segments.forEach((seg, idx) => {
      const initialSeg = initialSegments[idx]
      if (initialSeg && seg.text !== initialSeg.text) {
        editedIndices.add(idx)
      }
    })
    setEditedSegmentIndices(editedIndices)
  }

  // Navigate to next edited segment
  const navigateToNextEdited = (segments: any[]) => {
    const indices = Array.from(editedSegmentIndices).sort((a, b) => a - b)
    if (indices.length === 0) return
    
    const currentIdx = currentEditedIndex !== null ? indices.indexOf(currentEditedIndex) : -1
    const nextIdx = (currentIdx + 1) % indices.length
    setCurrentEditedIndex(indices[nextIdx])
    
    // Scroll to the segment
    setTimeout(() => {
      const element = document.getElementById(`segment-${indices[nextIdx]}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  // Navigate to previous edited segment
  const navigateToPrevEdited = (segments: any[]) => {
    const indices = Array.from(editedSegmentIndices).sort((a, b) => a - b)
    if (indices.length === 0) return
    
    const currentIdx = currentEditedIndex !== null ? indices.indexOf(currentEditedIndex) : -1
    const prevIdx = currentIdx <= 0 ? indices.length - 1 : currentIdx - 1
    setCurrentEditedIndex(indices[prevIdx])
    
    // Scroll to the segment
    setTimeout(() => {
      const element = document.getElementById(`segment-${indices[prevIdx]}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  // Handle Find & Replace
  const handleFindReplace = (version: any) => {
    setFindReplaceVersion(version)
    setFindTerm('')
    setReplaceTerm('')
    setFindReplaceResults([])
    setSelectedFindReplace(new Set())
    setShowFindReplace(true)
  }

  // Apply selected replacements
  const handleApplyFindReplace = () => {
    if (!findReplaceVersion) return
    
    // Start with the current version's segments
    const currentSegments = findReplaceVersion.segments || []
    const newSegments = currentSegments.map((seg: any) => ({ ...seg }))
    const selectedIndices = Array.from(selectedFindReplace)
    
    selectedIndices.forEach(resultIdx => {
      const result = findReplaceResults[resultIdx]
      const segIdx = result.segmentIndex
      
      if (newSegments[segIdx]) {
        // Perform the replacement in the segment text
        const originalText = newSegments[segIdx].text
        // Case-insensitive replace
        const regex = new RegExp(findTerm, 'gi')
        const newText = originalText.replace(regex, replaceTerm)
        
        newSegments[segIdx] = {
          ...newSegments[segIdx],
          text: newText
        }
      }
    })
    
    // Initialize editing state with the replacements applied
    setEditingSegments(newSegments)
    setInitialSegments(findReplaceVersion.segments.map((seg: any) => ({ ...seg })))
    updateEditedSegments(newSegments)
    setEditedText(newSegments.map((s: any) => s.text).join(' '))
    
    // Switch to editing mode
    setEditingTranscription(findReplaceVersion.id)
    
    // Close the modal
    setShowFindReplace(false)
    setFindReplaceResults([])
    setSelectedFindReplace(new Set())
  }

  // Cancel Find & Replace
  const handleCancelFindReplace = () => {
    setShowFindReplace(false)
    setFindTerm('')
    setReplaceTerm('')
    setFindReplaceResults([])
    setSelectedFindReplace(new Set())
  }

  const handlePromoteToFinal = async (versionId: string) => {
    try {
      // Save to database
      if (transcriptions.length > 0) {
        const transcription = transcriptions[0]
        // Check if this is T-1 (starts with 't1-')
        const versionIdToSave = versionId.startsWith('t1-') ? null : versionId
        
        const response = await fetch(`/api/transcriptions/${transcription.id}/final`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version_id: versionIdToSave })
        })
        
        const result = await response.json()
        if (result.success) {
          setFinalVersion(versionId)
          setActiveTab('final')
        } else {
          alert(`Failed to promote to final: ${result.error}`)
        }
      }
    } catch (error: any) {
      console.error('Error promoting to final:', error)
      alert(`Error: ${error.message}`)
    }
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

  const handleSendToInsight = async (transcriptionId: string) => {
    setSendingToInsight(true)
    try {
      const response = await fetch('/api/insight/send-to-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionId })
      })
      const result = await response.json()
      
      if (result.success) {
        setSentToInsight(transcriptionId)
        alert('Transcript sent to Insight! Metadata extraction completed.')
      } else {
        alert(`Failed to send to Insight: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error sending to Insight: ${error.message}`)
    } finally {
      setSendingToInsight(false)
    }
  }

  const handleSendToRAG = async (transcriptionId: string) => {
    setSendingToRAG(transcriptionId)
    try {
      const response = await fetch('/api/rag/send-to-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionId })
      })
      const result = await response.json()
      
      if (result.success) {
        alert(result.message || '✅ Transcript indexed for RAG!')
      } else {
        alert(`Failed to index for RAG: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Error indexing for RAG: ${error.message}`)
    } finally {
      setSendingToRAG(null)
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

  const loadTranslations = async () => {
    if (transcriptions.length === 0) return
    
    try {
      const response = await fetch(`/api/transcriptions/${transcriptions[0].id}/translate`)
      const result = await response.json()
      if (result.success) {
        setTranslations(result.data || [])
        // Load speech files for all translations
        await loadSpeechFilesForTranslations(result.data || [])
      }
      setTranslationsLoaded(true)
    } catch (error) {
      console.error('Error loading translations:', error)
      setTranslationsLoaded(true) // Set to true even on error to prevent infinite loading
    }
  }

  const loadSpeechFilesForTranslations = async (translations: any[]) => {
    try {
      const allSpeechFiles: any[] = []
      
      for (const translation of translations) {
        const response = await fetch(`/api/speech/generate?translation_id=${translation.id}`)
        const result = await response.json()
        if (result.success && result.data) {
          allSpeechFiles.push(...result.data)
        }
      }
      
      setGeneratedSpeech(allSpeechFiles)
      setSpeechLoaded(true)
    } catch (error) {
      console.error('Error loading speech files:', error)
      setSpeechLoaded(true) // Set to true even on error to prevent infinite loading
    }
  }

  const generateTranslation = async (languageCode: string) => {
    if (transcriptions.length === 0) return
    
    setGeneratingTranslation(languageCode)
    try {
      const response = await fetch(`/api/transcriptions/${transcriptions[0].id}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language_code: languageCode })
      })
      
      const result = await response.json()
      // Always reload translations (even on error) to sync UI state
      await loadTranslations()
      
      if (result.success) {
        // Success - translations already reloaded
      } else {
        // Check if it's a duplicate error (which is actually OK)
        if (result.error && result.error.includes('already exists')) {
          console.log(`Translation for ${languageCode} already exists - UI will update`)
        } else {
          alert(`Translation failed: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('Error generating translation:', error)
      alert('Failed to generate translation')
    } finally {
      setGeneratingTranslation(null)
    }
  }

  const generateSpeech = async (translationId: string, languageCode: string) => {
    console.log('Generating speech for:', { translationId, languageCode })
    setGeneratingSpeech(translationId)
    try {
      const response = await fetch('/api/speech/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          translation_id: translationId,
          language_code: languageCode
        })
      })
      
      const result = await response.json()
      if (result.success) {
        // Reload all speech files for all translations
        if (translations.length > 0) {
          await loadSpeechFilesForTranslations(translations)
        }
      } else {
        alert(`Speech generation failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error generating speech:', error)
      alert('Failed to generate speech')
    } finally {
      setGeneratingSpeech(null)
    }
  }

  // Helper function to split text by sentences (1 sentence per segment) using word-level timestamps
  const splitSegmentsBySentences = (segments: any[]): any[] => {
    const splitSegments: any[] = []
    
    segments.forEach((seg) => {
      const text = seg.text || ''
      if (!text.trim()) {
        splitSegments.push({ ...seg })
        return
      }
      
      // Split by sentence endings (. ! ?) but be careful with abbreviations
      // Split on . ! ? followed by space and capital letter, or end of string
      const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z][a-z])|(?<=[.!?])\s*$/).filter((s: string) => s.trim())
      
      if (sentences.length <= 1) {
        // Already one sentence, keep as is
        splitSegments.push({ ...seg })
      } else {
        // Use word-level timestamps if available for accurate timing
        const words = seg.words || []
        
        if (words.length > 0) {
          // Build word-to-sentence mapping by matching word order to sentences
          // Split each sentence into words and match sequentially
          let wordIdx = 0
          
          sentences.forEach((sentence, sentIdx) => {
            const sentenceText = sentence.trim()
            if (!sentenceText) return
            
            // Split sentence into words (remove punctuation for matching)
            const sentenceWordsText = sentenceText
              .replace(/[.,!?;:]/g, ' ')
              .split(/\s+/)
              .filter(w => w.length > 0)
            
            // Find words that belong to this sentence (sequential matching)
            const sentenceWords: any[] = []
            const wordsToMatch = sentenceWordsText.length
            
            // Match words sequentially - each sentence gets the next N words
            for (let i = 0; i < wordsToMatch && wordIdx < words.length; i++) {
              sentenceWords.push(words[wordIdx])
              wordIdx++
            }
            
            // Calculate sentence timestamps from word timestamps
            let sentenceStartTime = seg.start
            let sentenceEndTime = seg.end
            
            if (sentenceWords.length > 0) {
              // Use first word's start and last word's end
              sentenceStartTime = sentenceWords[0].start || seg.start
              sentenceEndTime = sentenceWords[sentenceWords.length - 1].end || seg.end
            } else {
              // Fallback: proportional distribution if no words matched
              const segmentDuration = seg.end - seg.start
              const avgSentenceDuration = segmentDuration / sentences.length
              sentenceStartTime = seg.start + (sentIdx * avgSentenceDuration)
              sentenceEndTime = sentIdx === sentences.length - 1 
                ? seg.end 
                : sentenceStartTime + avgSentenceDuration
            }
            
            splitSegments.push({
              id: seg.id * 10000 + sentIdx,
              seek: Math.floor(sentenceStartTime * 1000),
              start: sentenceStartTime,
              end: sentenceEndTime,
              text: sentenceText,
              words: sentenceWords,
              originalSegmentId: seg.id
            })
          })
        } else {
          // No word-level timestamps - use proportional distribution
          const segmentDuration = seg.end - seg.start
          const avgSentenceDuration = segmentDuration / sentences.length
          
          let currentStart = seg.start
          sentences.forEach((sentence, idx) => {
            const sentenceText = sentence.trim()
            if (!sentenceText) return
            
            const sentenceEnd = idx === sentences.length - 1 
              ? seg.end 
              : Math.min(currentStart + avgSentenceDuration, seg.end)
            
            splitSegments.push({
              id: seg.id * 10000 + idx,
              seek: Math.floor(currentStart * 1000),
              start: currentStart,
              end: sentenceEnd,
              text: sentenceText,
              words: [],
              originalSegmentId: seg.id
            })
            
            currentStart = sentenceEnd
          })
        }
      }
    })
    
    return splitSegments
  }

  const handleEditTranslation = async (translation: any) => {
    // Note: We use editingTextTranslation (not editingTranslation) for the new inline view
    setEditedTranslationText(translation.translated_text)
    
    // Initialize segments array from translation
    // Get original segments to match timing
    let originalSegments: any[] = []
    if (transcriptions.length > 0) {
      const transcription = transcriptions[0]
      if (transcription.final_version_id !== undefined) {
        if (transcription.final_version_id === null) {
          originalSegments = transcription.json_with_timestamps?.segments || []
        } else {
          const finalVersion = transcription.versions?.find((v: any) => v.id === transcription.final_version_id)
          if (finalVersion) {
            originalSegments = finalVersion.json_with_timestamps?.segments || []
          }
        }
      }
    }
    
    // Get translation segments
    const translationSegments = translation.json_with_timestamps?.segments || []
    
    // Match translation segments to original segments by timing
    let matchedSegments: any[] = []
    
    // Check if segments are valid (not all empty or same repeated text)
    const hasValidSegments = translationSegments.length > 0 && 
      translationSegments.some((seg: any) => seg.text && seg.text.trim() !== '') &&
      // Check if first segment text is different from second
      (translationSegments.length === 1 || translationSegments[0].text !== translationSegments[1].text)
    
    if (hasValidSegments && translationSegments.length === originalSegments.length) {
      // If we have valid segments that match in count, use them directly
      matchedSegments = originalSegments.map((originalSeg, idx) => {
        const matched = translationSegments[idx]
        return {
          id: originalSeg.id,
          seek: originalSeg.seek,
          start: originalSeg.start,
          end: originalSeg.end,
          text: matched?.text || '',
          words: [],
          originalSegmentId: originalSeg.id
        }
      })
    } else if (translation.translated_text && originalSegments.length > 0) {
      // Fallback: split the full translation text evenly across segments
      const translationWords = translation.translated_text.split(' ')
      const totalEnglishWords = originalSegments.reduce((sum, seg) => sum + seg.text.split(' ').length, 0)
      const wordRatio = translationWords.length / totalEnglishWords
      
      let currentWordIdx = 0
      matchedSegments = originalSegments.map((originalSeg) => {
        const segmentWordCount = originalSeg.text.split(' ').length
        const translatedWordCount = Math.round(segmentWordCount * wordRatio)
        const translatedWords = translationWords.slice(currentWordIdx, currentWordIdx + translatedWordCount)
        currentWordIdx += translatedWordCount
        
        return {
          id: originalSeg.id,
          seek: originalSeg.seek,
          start: originalSeg.start,
          end: originalSeg.end,
          text: translatedWords.join(' ') || '',
          words: [],
          originalSegmentId: originalSeg.id
        }
      })
    } else {
      // Last fallback: empty segments
      matchedSegments = originalSegments.map((originalSeg) => ({
        id: originalSeg.id,
        seek: originalSeg.seek,
        start: originalSeg.start,
        end: originalSeg.end,
        text: '',
        words: [],
        originalSegmentId: originalSeg.id
      }))
    }
    
    // CRITICAL: Split both English and translation segments by sentences using the SAME logic
    // This ensures perfect 1:1 alignment with identical timestamps
    
    // First, split English segments into sentences with accurate word-level timestamps
    const splitEnglishSegments = splitSegmentsBySentences(originalSegments)
    
    // Now, for each split English segment, we need to find the corresponding translation text
    // We'll split the translation segments the same way
    const alignedSegments: any[] = []
    
    // Process each original segment
    originalSegments.forEach((originalSeg, segIdx) => {
      // Get corresponding translation segment - it should have the SAME ID and timestamps
      const translationSeg = matchedSegments.find((m: any) => m.id === originalSeg.id) || 
                            matchedSegments[segIdx] || 
                            { text: '', id: originalSeg.id, start: originalSeg.start, end: originalSeg.end }
      
      // Get all split English segments for this original segment
      const splitEnglishForThisSegment = splitSegmentsBySentences([originalSeg])
      
      // Split the translation text into sentences to match
      const translationText = translationSeg.text || ''
      const translationSentences = translationText
        .split(/(?<=[.!?])\s+(?=[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ])/i)
        .filter((s: string) => s.trim())
      
      // For each split English sentence, create a matching translation segment
      splitEnglishForThisSegment.forEach((splitEngSeg: any, sentIdx: number) => {
        // CRITICAL: Use the EXACT same timestamps from the split English segment
        // This ensures perfect alignment
        const transSentence = translationSentences[sentIdx]?.trim() || ''
        
        alignedSegments.push({
          id: splitEngSeg.id, // Use the same ID structure as English
          seek: splitEngSeg.seek, // EXACT same seek
          start: splitEngSeg.start, // EXACT same start timestamp
          end: splitEngSeg.end, // EXACT same end timestamp
          text: transSentence,
          words: [],
          originalSegmentId: originalSeg.id
        })
      })
    })
    
    setEditedTranslationSegments(alignedSegments)
  }

  const handleSaveTranslationVersion = async (translationId: string) => {
    setSavingTranslation(true)
    try {
      const originalTranslation = translations.find((t: any) => t.id === translationId)
      if (!originalTranslation) return

      // Merge split segments back into original segment structure
      // Group split segments by their originalSegmentId
      const segmentsByOriginal: Record<number, any[]> = {}
      editedTranslationSegments.forEach((seg: any) => {
        const origId = seg.originalSegmentId || seg.id
        if (!segmentsByOriginal[origId]) {
          segmentsByOriginal[origId] = []
        }
        segmentsByOriginal[origId].push(seg)
      })

      // Get original English segments to match structure
      let originalSegments: any[] = []
      if (transcriptions.length > 0) {
        const transcription = transcriptions[0]
        if (transcription.final_version_id !== undefined) {
          if (transcription.final_version_id === null) {
            originalSegments = transcription.json_with_timestamps?.segments || []
          } else {
            const finalVersion = transcription.versions?.find((v: any) => v.id === transcription.final_version_id)
            if (finalVersion) {
              originalSegments = finalVersion.json_with_timestamps?.segments || []
            }
          }
        }
      }

      // Reconstruct segments matching original structure
      const segmentsToSave = originalSegments.map((origSeg) => {
        const splitSegments = segmentsByOriginal[origSeg.id] || []
        if (splitSegments.length > 0) {
          // Merge split segments back into one
          const mergedText = splitSegments.map((s: any) => s.text).join(' ').trim()
          const firstSplit = splitSegments[0]
          const lastSplit = splitSegments[splitSegments.length - 1]
          
          return {
            id: origSeg.id,
            seek: origSeg.seek,
            start: origSeg.start,
            end: origSeg.end,
            text: mergedText,
            words: []
          }
        } else {
          // Fallback: use original segment structure
          return {
            id: origSeg.id,
            seek: origSeg.seek,
            start: origSeg.start,
            end: origSeg.end,
            text: origSeg.text || '',
            words: []
          }
        }
      })

      // Build full text from merged segments
      const fullText = segmentsToSave.map((seg: any) => seg.text).join(' ').trim() || editedTranslationText

      // Save the translation version
      const response = await fetch(`/api/translations/${translationId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_text: fullText,
          json_with_timestamps: {
            segments: segmentsToSave
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Extract dictionary terms if text was significantly changed
        if (transcriptions.length > 0) {
          const transcription = transcriptions[0]
          
          try {
            // Get original English text
            let originalEnglishText = ''
            if (transcription.final_version_id !== undefined) {
              if (transcription.final_version_id === null) {
                originalEnglishText = transcription.raw_text
              } else {
                const finalVersion = transcription.versions?.find((v: any) => v.id === transcription.final_version_id)
                if (finalVersion) originalEnglishText = finalVersion.edited_text
              }
            }
            
            // Store dictionary terms (simplified - store full texts for now)
            // In production, extract specific word/phrase pairs
            if (originalEnglishText && editedTranslationText !== originalTranslation.translated_text) {
              await fetch('/api/translations/extract-dictionary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  original_text: originalTranslation.translated_text.substring(0, 500),
                  edited_text: editedTranslationText.substring(0, 500),
                  language_code: originalTranslation.language_code,
                  transcription_id: transcription.id
                })
              })
            }
          } catch (dictError) {
            console.error('Error extracting dictionary terms:', dictError)
            // Don't fail the save operation if dictionary extraction fails
          }
        }
        
        // Reload translations to get the new version
        const reloadResponse = await fetch(`/api/transcriptions/${transcriptions[0].id}/translate`)
        const reloadResult = await reloadResponse.json()
        if (reloadResult.success) {
          const updatedTranslations = reloadResult.data || []
          setTranslations(updatedTranslations)
          // Reload speech files since old ones were deleted
          await loadSpeechFilesForTranslations(updatedTranslations)
        }
        
        setEditingTextTranslation(null) // Use editingTextTranslation for inline view
        setEditedTranslationText('')
        setEditedTranslationSegments([])
      } else {
        alert(`Failed to save translation version: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving translation version:', error)
      alert('Failed to save translation version')
    } finally {
      setSavingTranslation(false)
    }
  }

  const handleCancelEditTranslation = () => {
    setEditingTextTranslation(null) // Use editingTextTranslation for inline view
    setEditedTranslationText('')
    setEditedTranslationSegments([])
  }

  const handlePromoteToSpeech = async (translationId: string) => {
    try {
      const response = await fetch(`/api/translations/${translationId}/promote-to-speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const result = await response.json()
      if (result.success) {
        // Reload translations to get updated state
        await loadTranslations()
      } else {
        alert(`Failed to promote translation to speech: ${result.error}`)
      }
    } catch (error) {
      console.error('Error promoting translation to speech:', error)
      alert('Failed to promote translation to speech')
    }
  }

  const handleDownloadTranslationText = (translation: any) => {
    try {
      // Get the final version or current translation text with timestamps
      let textToExport = translation.translated_text
      let segments = translation.json_with_timestamps?.segments || []
      
      // If there's a final version, use that
      if (translation.final_version_id) {
        // We'd need to fetch the version, but for now use current translation
        // In a full implementation, we'd fetch the version here
      }
      
      // Create JSON export
      const exportData = {
        language_code: translation.language_code,
        translation_id: translation.id,
        segments: segments.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text
        })),
        full_text: textToExport
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `translation_${translation.language_code}_${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading translation text:', error)
      alert('Failed to download translation text')
    }
  }

  const handleDownloadSpeech = async (audioUrl: string, languageCode: string) => {
    try {
      // Fetch the audio file
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      
      // Create a download link and trigger download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `speech_${languageCode}_${Date.now()}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading audio:', error)
      alert('Failed to download audio file')
    }
  }

  // Load translations when tab switches to translations-related tabs
  useEffect(() => {
    if ((activeTab === 'translations' || activeTab === 'text-translations' || activeTab === 'speech-translations') && transcriptions.length > 0) {
      loadTranslations()
    }
  }, [activeTab, transcriptions])

  // Check if already sent to Insight
  useEffect(() => {
    if (transcriptions.length > 0 && finalVersion) {
      const transcriptionId = transcriptions[0].id
      fetch(`/api/insight/send-to-brain?transcription_id=${transcriptionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSentToInsight(transcriptionId)
          }
        })
        .catch(err => console.error('Error checking Insight status:', err))
    }
  }, [transcriptions, finalVersion])

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
              onClick={() => setActiveTab('original')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'original'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Original Transcript
            </button>
            <button
              onClick={() => setActiveTab('edits')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'edits'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Edits
            </button>
            {!isEditor && (
              <button
                onClick={() => setActiveTab('text-translations')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'text-translations'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Text Translations
              </button>
            )}
            {!isEditor && (
              <button
                onClick={() => setActiveTab('speech-translations')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'speech-translations'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Speech Translations
              </button>
            )}
            {!isEditor && (
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
            )}
            {!isEditor && (
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
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'original' && (
            <>
              {/* Original Transcript Tab - Read-only T-1 */}
              {loading ? (
                <p className="text-sm text-gray-600">Loading transcription...</p>
              ) : transcriptions.length === 0 ? (
                <p className="text-sm text-gray-600 italic dark:text-gray-300">No transcription yet</p>
              ) : transcriptions.map((transcription) => (
                <div key={transcription.id} className="space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-900 dark:border-yellow-700">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      ℹ️ This is the original T-1 (Whisper) transcription - read-only
                    </p>
                  </div>
                  {transcription.json_with_timestamps?.segments && transcription.json_with_timestamps.segments.length > 0 ? (
                    <div className="bg-white border border-gray-300 rounded p-3 max-h-96 overflow-y-auto dark:bg-gray-800 dark:border-gray-600">
                      <pre className="whitespace-pre-wrap text-sm font-mono dark:text-gray-100">
                        {transcription.json_with_timestamps.segments.map(seg => 
                          `[${formatTime(seg.start)}-${formatTime(seg.end)}] ${seg.text}`
                        ).join('\n')}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-300 rounded p-3 max-h-96 overflow-y-auto dark:bg-gray-800 dark:border-gray-600">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap dark:text-gray-100">
                        {transcription.raw_text}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          
          {activeTab === 'edits' && (
            <>
              {loading ? (
                <p className="text-sm text-gray-600">Loading transcription...</p>
              ) : transcriptions.length === 0 ? (
                <p className="text-sm text-gray-600 italic dark:text-gray-300">No transcription yet</p>
              ) : (
                <div className="space-y-2">
                  {transcriptions.map((transcription) => {
                    const metadata = transcription.json_with_timestamps?.metadata
                    
                    // Build all versions array: H versions in reverse chronological order, then T-1 at bottom
                    const hVersions = (transcription.versions || [])
                      .sort((a, b) => a.version_number - b.version_number) // Sort ascending
                      .map((v) => ({
                        id: v.id,
                        transcriptionId: transcription.id,
                        type: v.version_type,
                        text: v.edited_text,
                        created_at: v.created_at,
                        segments: v.json_with_timestamps?.segments || transcription.json_with_timestamps?.segments || [],
                        metadata: metadata,
                        corrections_applied: v.dictionary_corrections_applied || [], // Store edit data
                        isLatest: false,
                        canEdit: false
                      }))
                      .reverse() // Reverse so latest appears first
                    
                    // Mark the latest H version (now first after reverse)
                    if (hVersions.length > 0) {
                      hVersions[0].isLatest = true
                      hVersions[0].canEdit = true
                    }
                    
                    // T-1 goes at bottom
                    // Allow editing T-1 if there are no H-versions yet (to create the first one)
                    const canEditT1 = hVersions.length === 0
                    const allVersions = [
                      ...hVersions, // H versions in reverse chronological order (latest first)
                      {
                        id: `t1-${transcription.id}`,
                        transcriptionId: transcription.id,
                        type: transcription.transcription_type,
                        text: transcription.raw_text,
                        created_at: transcription.created_at,
                        segments: transcription.json_with_timestamps?.segments || [],
                        metadata: metadata,
                        corrections_applied: [], // T-1 has no edits (it's the original)
                        isLatest: hVersions.length === 0, // T-1 is "latest" if no H-versions exist
                        canEdit: canEditT1 // Allow editing T-1 to create first H-version
                      }
                    ]
                    
                    // Helper functions for collapse/expand - find the latest version (H version or T-1)
                    const latestVersion = allVersions.find(v => v.isLatest)
                    const latestVersionId = latestVersion?.id || allVersions[0]?.id // Fallback to first version if no latest
                    const isExpanded = (versionId: string) => {
                      if (expandedVersions.size === 0) {
                        // Default: expand the latest version (or first if no H versions exist)
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
                            <div key={version.id} className="border border-gray-200 rounded-lg dark:border-gray-700">
                              {/* Version Header - Collapsible */}
                              <button
                                type="button"
                                onClick={() => toggleVersion(version.id)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition dark:hover:bg-gray-800"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">{versionIsExpanded ? '▼' : '▶'}</span>
                                  <div className="text-left">
                                    <p className="text-sm font-semibold dark:text-gray-100">{version.type}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(version.created_at).toLocaleString()}</p>
                                  </div>
                                </div>
                                {!versionIsEditing && hasTimestamps && (
                                  <span className="text-xs text-green-600 font-medium dark:text-green-400">🎬 Has timestamps</span>
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
                                        onClick={() => handleFindReplace(version)}
                                        className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                                      >
                                        🔍 Find & Replace
                                      </button>
                                      {!isEditor && (
                                        <button
                                          onClick={() => handlePromoteToFinal(version.id)}
                                          className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                        >
                                          Ready to Translate
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Metadata Box */}
                                  {version.metadata && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-900 dark:border-blue-700">
                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                        {audioDuration !== null && audioDuration !== undefined && (
                                          <div>
                                            <span className="text-blue-600 font-medium dark:text-blue-300">Audio length: </span>
                                            <span className="text-gray-700 font-bold dark:text-gray-100">{formatTime(audioDuration)}</span>
                                          </div>
                                        )}
                                        {version.metadata.transcription_time_seconds !== undefined && (
                                          <div>
                                            <span className="text-blue-600 font-medium dark:text-blue-300">Time to transcribe: </span>
                                            <span className="text-gray-700 font-bold dark:text-gray-100">{version.metadata.transcription_time_seconds}s</span>
                                          </div>
                                        )}
                                        {version.metadata.word_count !== undefined && (
                                          <div>
                                            <span className="text-blue-600 font-medium dark:text-blue-300">Words: </span>
                                            <span className="text-gray-700 font-bold dark:text-gray-100">{version.metadata.word_count.toLocaleString()}</span>
                                          </div>
                                        )}
                                        {version.metadata.text_length !== undefined && (
                                          <div>
                                            <span className="text-blue-600 font-medium dark:text-blue-300">Characters: </span>
                                            <span className="text-gray-700 font-bold dark:text-gray-100">{version.metadata.text_length.toLocaleString()}</span>
                                          </div>
                                        )}
                                        {version.metadata.estimated_cost !== undefined && (
                                          <div>
                                            <span className="text-blue-600 font-medium dark:text-blue-300">Est. Cost: </span>
                                            <span className="text-gray-700 font-bold dark:text-gray-100">${version.metadata.estimated_cost.toFixed(4)}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                                                    {/* Editing Interface - Side by Side */}
                                  {versionIsEditing ? (
                                    <div className="space-y-4">
                                      {/* Side-by-side editor */}
                                      {(() => {
                                        // Get T-1 segments as reference
                                        const t1Segments = transcription.json_with_timestamps?.segments || []
                                        
                                        return (
                                          <div className="grid grid-cols-2 gap-4">
                                            {/* Left: T-1 Original (Read-only) */}
                                            <div>
                                              <h4 className="text-sm font-semibold text-gray-700 mb-2 dark:text-gray-200">Original T-1 (Reference)</h4>
                                              <div className="max-h-[80vh] overflow-y-auto space-y-2">
                                                {t1Segments.map((seg: any, idx: number) => (
                                                  <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
                                                    <div className="text-xs text-gray-500 mb-1 dark:text-gray-400">
                                                      {formatTime(seg.start)} - {formatTime(seg.end)}
                                                    </div>
                                                    <div className="text-sm leading-relaxed dark:text-gray-100">{seg.text}</div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                            
                                            {/* Right: Editable Version */}
                                            <div>
                                              <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Editing Version (Editable)</h4>
                                                {editedSegmentIndices.size > 0 && (
                                                  <span className="text-xs text-orange-600 font-medium dark:text-orange-400">
                                                    {editedSegmentIndices.size} segment{editedSegmentIndices.size !== 1 ? 's' : ''} edited
                                                  </span>
                                                )}
                                              </div>
                                              <div className="max-h-[80vh] overflow-y-auto space-y-2">
                                                {editingSegments.map((seg: any, idx: number) => {
                                                  const initialSeg = initialSegments[idx]
                                                  const isEdited = initialSeg && seg.text !== initialSeg.text
                                                  const isCurrent = currentEditedIndex === idx
                                                  
                                                  return (
                                                    <div 
                                                      key={idx} 
                                                      id={`segment-${idx}`}
                                                      className={`p-3 rounded border ${
                                                        isCurrent && isEdited 
                                                          ? 'bg-yellow-50 border-yellow-400 shadow-md dark:bg-yellow-900 dark:border-yellow-600' 
                                                          : isEdited 
                                                            ? 'bg-orange-50 border-orange-300 dark:bg-orange-900 dark:border-orange-700' 
                                                            : 'bg-blue-50 border-blue-200 dark:bg-blue-900 dark:border-blue-700'
                                                      }`}
                                                    >
                                                      <div className="flex items-center justify-between mb-1">
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                          {formatTime(seg.start)} - {formatTime(seg.end)}
                                                        </div>
                                                        {isEdited && (
                                                          <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded dark:bg-orange-600">
                                                            ✓ Edited
                                                          </span>
                                                        )}
                                                      </div>
                                                      <textarea
                                                        value={seg.text || ''}
                                                        onChange={(e) => {
                                                          const newSegments = [...editingSegments]
                                                          newSegments[idx] = { ...seg, text: e.target.value }
                                                          setEditingSegments(newSegments)
                                                          updateEditedSegments(newSegments)
                                                          // Update editedText for compatibility
                                                          setEditedText(newSegments.map((s: any) => s.text).join(' '))
                                                        }}
                                                        onFocus={() => setCurrentEditedIndex(idx)}
                                                        className="w-full p-2 border border-gray-300 rounded text-sm resize-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                                                        rows={3}
                                                        placeholder="Edit this segment..."
                                                      />
                                                    </div>
                                                  )
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })()}
                                      
                                      {/* Navigation buttons for edited segments */}
                                      {editedSegmentIndices.size > 0 && (
                                        <div className="flex gap-2 items-center border-t pt-3 dark:border-gray-700">
                                          <span className="text-xs text-gray-600 dark:text-gray-400">Navigate edited segments:</span>
                                          <button
                                            onClick={() => navigateToPrevEdited(editingSegments)}
                                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800"
                                            title="Previous edited segment"
                                          >
                                            ← Prev
                                          </button>
                                          <button
                                            onClick={() => navigateToNextEdited(editingSegments)}
                                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800"
                                            title="Next edited segment"
                                          >
                                            Next →
                                          </button>
                                        </div>
                                      )}
                                      
                                      {/* Action buttons */}
                                      <div className="flex gap-2">
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
                                    /* Display mode - Show segments with timestamps */
                                    <div className="space-y-2">
                                      {hasTimestamps && version.segments.length > 0 ? (
                                        version.segments.map((seg: any, idx: number) => {
                                          // Check if this segment was edited in this version
                                          const segmentWasEdited = version.corrections_applied && version.corrections_applied.length > 0 && 
                                            version.corrections_applied.some((edit: any) => {
                                              // Check if edit timestamp overlaps with segment timestamp
                                              return edit.position_start >= seg.start && edit.position_end <= seg.end
                                            })
                                          
                                          return (
                                            <div key={idx} className="p-3 bg-white border border-gray-200 rounded dark:bg-gray-800 dark:border-gray-600">
                                              <div className="flex items-center justify-between mb-1">
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                  {formatTime(seg.start)} - {formatTime(seg.end)}
                                                </div>
                                                {segmentWasEdited && (
                                                  <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded dark:bg-orange-600">
                                                    ✏️ ✓ Edited
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-sm leading-relaxed dark:text-gray-100">{seg.text}</p>
                                            </div>
                                          )
                                        })
                                      ) : (
                                        <div className="bg-white p-3 rounded border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
                                          <p className="text-sm leading-relaxed whitespace-pre-wrap dark:text-gray-100">
                                            {version.text}
                                          </p>
                                        </div>
                                      )}
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

          {activeTab === 'final' && !isEditor && (
            <div className="space-y-4">
              {!finalVersion && (
                <p className="text-sm text-gray-600 italic text-center py-8 dark:text-gray-400">
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
                  if (!version) return null
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
                  <div key={transcription.id} className="bg-white p-4 rounded border border-green-300 dark:bg-gray-800 dark:border-green-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-green-700 dark:text-green-400">✓ {finalVersionObj.type} - Final Version</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAnalyze(transcription.id)}
                          disabled={analyzing}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                        >
                          {analyzing ? 'Analyzing...' : 'Send for Analysis'}
                        </button>
                        <button
                          onClick={() => handleSendToInsight(transcription.id)}
                          disabled={sendingToInsight || sentToInsight === transcription.id}
                          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                          {sendingToInsight ? (
                            <>
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : sentToInsight === transcription.id ? (
                            '✓ Sent to Insight'
                          ) : (
                            '🚀 Send to Insight'
                          )}
                        </button>
                        {sentToInsight === transcription.id && (
                          <button
                            onClick={() => handleSendToRAG(transcription.id)}
                            disabled={sendingToRAG === transcription.id}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-700 hover:to-pink-700 text-sm disabled:opacity-50 flex items-center gap-2 border border-purple-400"
                          >
                            {sendingToRAG === transcription.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Indexing...
                              </>
                            ) : (
                              '🤖 Index for RAG'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Dubbing Script Format - Always Visible */}
                    {finalVersionObj.segments.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 dark:text-gray-200">Dubbing Script Format (with timestamps)</h4>
                        <div className="bg-purple-50 border border-purple-200 rounded p-3 max-h-64 overflow-y-auto dark:bg-purple-900 dark:border-purple-700">
                          <pre className="whitespace-pre-wrap text-xs font-mono dark:text-gray-100">
                            {finalVersionObj.segments.map(seg => `[${formatTime(seg.start)}-${formatTime(seg.end)}]\n${seg.text}\n`).join('\n')}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {/* Full Text Display */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 dark:text-gray-200">Complete Transcript (no timestamps)</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-64 overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap dark:text-gray-100">{finalVersionObj.text}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {finalVersion && !transcriptions.some(t => 
                finalVersion.startsWith('t1-') && finalVersion.includes(t.id) ||
                t.versions?.some(v => v.id === finalVersion)
              ) && (
                <p className="text-sm text-gray-600 italic dark:text-gray-400">No matching version found.</p>
              )}
            </div>
          )}

          {activeTab === 'analysis' && !isEditor && (
            <div className="space-y-4">
              {analyzing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-sm text-gray-600 dark:text-gray-300">Analyzing content with Claude...</span>
                </div>
              ) : analysis ? (
                <div className="bg-white p-4 rounded border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold dark:text-gray-100">Content Analysis</h3>
                    <button
                      onClick={() => setShowAnalysisInfo(!showAnalysisInfo)}
                      className="relative"
                      title="Analysis Instructions"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Info Popup */}
                  {showAnalysisInfo && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAnalysisInfo(false)}>
                      <div className="bg-white p-6 rounded-lg max-w-2xl max-h-96 overflow-y-auto dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold dark:text-gray-100">Analysis Instructions</h3>
                          <button onClick={() => setShowAnalysisInfo(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-sm space-y-2">
                          <div>
                            <p className="font-medium mb-1 dark:text-gray-200">1. CONTENT_TYPE:</p>
                            <p className="text-gray-600 dark:text-gray-300">The primary category (Tutorial, Presentation, Interview, Marketing, Entertainment, Educational, Product Demo, Meeting, Training)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1 dark:text-gray-200">2. THEMATIC_TAGS:</p>
                            <p className="text-gray-600 dark:text-gray-300">An array of 3-5 key themes or topics (e.g., ["Healthcare", "Emergency Medicine", "Continuing Education"])</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1 dark:text-gray-200">3. KEY_CONCEPTS:</p>
                            <p className="text-gray-600 dark:text-gray-300">An array of the main concepts covered (e.g., ["CT Utilization", "Clinical Decision Making", "Patient Care"])</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1 dark:text-gray-200">4. TARGET_AUDIENCE:</p>
                            <p className="text-gray-600 dark:text-gray-300">Who is the primary audience? (Healthcare Providers, Emergency Physicians, Medical Students, General Public)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1 dark:text-gray-200">5. TONE:</p>
                            <p className="text-gray-600 dark:text-gray-300">The overall tone and style (Professional, Casual, Technical, Conversational, Educational)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1 dark:text-gray-200">6. DURATION_CATEGORY:</p>
                            <p className="text-gray-600 dark:text-gray-300">How long is this content? (Short - under 5 min, Medium - 5-15 min, Long - 15+ min)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1 dark:text-gray-200">7. LANGUAGE_STYLE:</p>
                            <p className="text-gray-600 dark:text-gray-300">The complexity of language used (Technical/Jargon-Heavy, Moderate, Simple/Layperson-Friendly)</p>
                          </div>
                          <div>
                            <p className="font-medium mb-1 dark:text-gray-200">8. SUMMARY:</p>
                            <p className="text-gray-600 dark:text-gray-300">A brief 2-3 sentence summary of the content</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {analysis.content_type && (
                      <div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Content Type: </span>
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs dark:bg-blue-900 dark:text-blue-200">{analysis.content_type}</span>
                      </div>
                    )}
                    
                    {analysis.thematic_tags && analysis.thematic_tags.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Themes: </span>
                        <div className="flex gap-1 flex-wrap mt-1">
                          {analysis.thematic_tags.map((tag: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs dark:bg-green-900 dark:text-green-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {analysis.key_concepts && analysis.key_concepts.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Key Concepts:</span>
                        <ul className="list-disc list-inside mt-1 text-sm space-y-1 dark:text-gray-300">
                          {analysis.key_concepts.map((concept: string, idx: number) => (
                            <li key={idx}>{concept}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.target_audience && (
                      <div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Target Audience: </span>
                        <span className="text-sm dark:text-gray-300">{analysis.target_audience}</span>
                      </div>
                    )}
                    
                    {analysis.tone && (
                      <div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Tone: </span>
                        <span className="text-sm dark:text-gray-300">{analysis.tone}</span>
                      </div>
                    )}
                    
                    {analysis.summary && (
                      <div className="border-t border-gray-200 pt-3 mt-3 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Summary:</span>
                        <p className="text-sm text-gray-700 mt-1 dark:text-gray-300">{analysis.summary}</p>
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
                        if (!version) return null
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
                            <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-48 overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
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

          {activeTab === 'text-translations' && !isEditor && (
            <div className="space-y-4">
              {!finalVersion ? (
                <p className="text-sm text-gray-600 italic text-center py-8 dark:text-gray-300">
                  No version ready for translation. Go to the <span className="font-medium">Edits</span> tab and click "Ready to Translate" on a version first.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Translate and edit your transcription into multiple languages:</p>
                    <div className="flex gap-2">
                      {translationsLoaded && transcriptions.length > 0 && (() => {
                        const allLanguages = [
                          { code: 'sp', name: 'Spanish', flag: '🇪🇸' },
                          { code: 'pr', name: 'Portuguese', flag: '🇵🇹' },
                          { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
                          { code: 'fr', name: 'French', flag: '🇫🇷' },
                          { code: 'ge', name: 'German', flag: '🇩🇪' },
                          { code: 'it', name: 'Italian', flag: '🇮🇹' },
                          { code: 'ma', name: 'Mandarin', flag: '🇨🇳' },
                          { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
                          { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
                        ]
                        const existingCodes = translations.map((t: any) => t.language_code)
                        const toTranslate = allLanguages.filter(lang => !existingCodes.includes(lang.code))
                        
                        if (toTranslate.length === 0) return null
                        
                        return <button
                          onClick={async () => {
                            console.log(`Batch translating ${toTranslate.length} languages...`)
                            for (const lang of toTranslate) {
                              console.log(`Translating to ${lang.name}...`)
                              await generateTranslation(lang.code)
                              await new Promise(resolve => setTimeout(resolve, 500))
                            }
                            console.log('Batch translation complete!')
                          }}
                          disabled={generatingTranslation !== null}
                          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                          {generatingTranslation !== null ? (
                            <>
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Translating...
                            </>
                          ) : (
                            `🚀 Batch Translate ${toTranslate.length} Languages`
                          )}
                        </button>
                      })()}
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Select Language to Edit:</label>
                    {translations.length === 0 ? (
                      <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                        No translations yet. Use the "Batch Translate" button above to generate translations first.
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedLanguageForEdit || ''}
                          onChange={(e) => setSelectedLanguageForEdit(e.target.value || null)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                        >
                          <option value="">-- Select a language --</option>
                          {[
                            { code: 'sp', name: 'Spanish', flag: '🇪🇸' },
                            { code: 'pr', name: 'Portuguese', flag: '🇵🇹' },
                            { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
                            { code: 'fr', name: 'French', flag: '🇫🇷' },
                            { code: 'ge', name: 'German', flag: '🇩🇪' },
                            { code: 'it', name: 'Italian', flag: '🇮🇹' },
                            { code: 'ma', name: 'Mandarin', flag: '🇨🇳' },
                            { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
                            { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
                          ].map(lang => {
                            const translation = translations.find((t: any) => t.language_code === lang.code)
                            if (!translation) return null
                            return (
                            <option key={lang.code} value={lang.code}>
                              {lang.flag} {lang.name} {translation.is_archived ? '(Archived)' : ''}
                            </option>
                            )
                          })}
                        </select>
                        {selectedLanguageForEdit && (() => {
                          const translation = translations.find((t: any) => t.language_code === selectedLanguageForEdit)
                          if (!translation) return null
                          
                          const sourceVersion = translation.source_version
                          const sourceVersionType = sourceVersion?.version_type || (translation.source_transcription_version_id === null ? 'T-1' : 'Unknown')
                          const isArchived = translation.is_archived
                          
                          return (
                            <div className="relative group">
                              <button
                                type="button"
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                title="Translation source info"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <div className="text-sm space-y-2">
                                  <div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Source:</span>{' '}
                                    <span className="text-gray-600 dark:text-gray-400">{sourceVersionType}</span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Status:</span>{' '}
                                    {isArchived ? (
                                      <span className="text-orange-600 dark:text-orange-400">Archived (Outdated)</span>
                                    ) : (
                                      <span className="text-green-600 dark:text-green-400">Current</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Created:</span>{' '}
                                    <span className="text-gray-600 dark:text-gray-400">
                                      {new Date(translation.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Side-by-side editing interface */}
                  {selectedLanguageForEdit && (() => {
                    const translation = translations.find((t: any) => t.language_code === selectedLanguageForEdit)
                    if (!translation) return null

                    const isEditing = editingTextTranslation === translation.id
                    const langInfo = [
                      { code: 'sp', name: 'Spanish', flag: '🇪🇸' },
                      { code: 'pr', name: 'Portuguese', flag: '🇵🇹' },
                      { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
                      { code: 'fr', name: 'French', flag: '🇫🇷' },
                      { code: 'ge', name: 'German', flag: '🇩🇪' },
                      { code: 'it', name: 'Italian', flag: '🇮🇹' },
                      { code: 'ma', name: 'Mandarin', flag: '🇨🇳' },
                      { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
                      { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
                    ].find(l => l.code === selectedLanguageForEdit)

                    // Get English original segments
                    let englishSegments: any[] = []
                    if (transcriptions.length > 0) {
                      const transcription = transcriptions[0]
                      if (transcription.final_version_id !== undefined) {
                        if (transcription.final_version_id === null) {
                          englishSegments = transcription.json_with_timestamps?.segments || []
                        } else {
                          const finalVersion = transcription.versions?.find((v: any) => v.id === transcription.final_version_id)
                          if (finalVersion) {
                            englishSegments = finalVersion.json_with_timestamps?.segments || []
                          }
                        }
                      }
                    }

                    // Get translation segments
                    const translationSegments = translation.json_with_timestamps?.segments || []

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold dark:text-gray-100">
                            {langInfo?.flag} {langInfo?.name}
                          </h3>
                          {!isEditing && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingTextTranslation(translation.id)
                                  handleEditTranslation(translation)
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleFindReplace({
                                  segments: translationSegments,
                                  text: translation.translated_text,
                                  id: translation.id
                                })}
                                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                              >
                                🔍 Find & Replace
                              </button>
                              {translation.final_version_id && (
                                <button
                                  onClick={() => handlePromoteToSpeech(translation.id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                >
                                  Promote to Speech Translation
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-4">
                            {/* Left: English Original (Read-only) */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 dark:text-gray-200">English Original (Reference)</h4>
                              <div className="max-h-[80vh] overflow-y-auto space-y-2">
                                {(() => {
                                  // Split English segments by sentences for display
                                  const splitEnglish = splitSegmentsBySentences(englishSegments)
                                  return splitEnglish.map((seg: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
                                      <div className="text-xs text-gray-500 mb-1 dark:text-gray-400">
                                        {formatTime(seg.start)} - {formatTime(seg.end)}
                                      </div>
                                      <div className="text-sm leading-relaxed dark:text-gray-100">{seg.text}</div>
                                    </div>
                                  ))
                                })()}
                              </div>
                            </div>
                            
                            {/* Right: Translated Version (Editable) */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Translation (Editable)</h4>
                              </div>
                              <div className="max-h-[80vh] overflow-y-auto space-y-2">
                                {(() => {
                                  // CRITICAL: Use the SAME split English segments as the left side
                                  // This ensures perfect timestamp alignment
                                  const splitEnglish = splitSegmentsBySentences(englishSegments)
                                  
                                  // Get translation segments - should already be aligned from handleEditTranslation
                                  // If empty, initialize using the same split structure
                                  let translationSegs = editedTranslationSegments
                                  
                                  if (translationSegs.length === 0 && translation.translated_text) {
                                    // Initialize by matching to English segment structure
                                    // Split translation into sentences to match English sentences
                                    const translationText = translation.translated_text
                                    const translationSentences = translationText
                                      .split(/(?<=[.!?])\s+(?=[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞ])/i)
                                      .filter((s: string) => s.trim())
                                    
                                    // Map each English sentence to a translation sentence
                                    translationSegs = splitEnglish.map((engSeg: any, idx: number) => ({
                                      id: engSeg.id, // CRITICAL: Same ID as English
                                      seek: engSeg.seek, // CRITICAL: Same seek as English
                                      start: engSeg.start, // CRITICAL: Same start timestamp as English
                                      end: engSeg.end, // CRITICAL: Same end timestamp as English
                                      text: translationSentences[idx]?.trim() || '',
                                      words: [],
                                      originalSegmentId: engSeg.originalSegmentId || engSeg.id
                                    }))
                                    
                                    // Set them so they persist
                                    if (translationSegs.length > 0) {
                                      setEditedTranslationSegments(translationSegs)
                                    }
                                  }
                                  
                                  // CRITICAL: Match by index - both arrays MUST be the same length
                                  // and have identical timestamps
                                  return splitEnglish.map((seg: any, idx: number) => {
                                    // Find translation segment with matching ID or use index
                                    const translatedSegment = translationSegs.find((t: any) => t.id === seg.id) || 
                                                             translationSegs[idx] || 
                                                             { text: '', start: seg.start, end: seg.end, id: seg.id, seek: seg.seek }
                                    
                                    // CRITICAL: Use English segment timestamps to ensure alignment
                                    const segmentText = translatedSegment.text || ''
                                    
                                    return (
                                      <div key={seg.id || idx} className="p-3 bg-blue-50 rounded border border-blue-200 dark:bg-blue-900 dark:border-blue-700">
                                        <div className="text-xs text-gray-500 mb-1 dark:text-gray-400">
                                          {formatTime(seg.start)} - {formatTime(seg.end)}
                                        </div>
                                        <textarea
                                          value={segmentText}
                                          onChange={(e) => {
                                            const newSegments = [...translationSegs]
                                            // Ensure array is long enough
                                            while (newSegments.length <= idx) {
                                              newSegments.push({ 
                                                text: '', 
                                                start: seg.start, 
                                                end: seg.end,
                                                id: seg.id,
                                                seek: seg.seek,
                                                originalSegmentId: seg.originalSegmentId
                                              })
                                            }
                                            // Update or create segment with EXACT same timestamps as English
                                            newSegments[idx] = {
                                              id: seg.id, // CRITICAL: Same ID
                                              seek: seg.seek, // CRITICAL: Same seek
                                              start: seg.start, // CRITICAL: Same start timestamp
                                              end: seg.end, // CRITICAL: Same end timestamp
                                              text: e.target.value,
                                              words: [],
                                              originalSegmentId: seg.originalSegmentId || seg.id
                                            }
                                            setEditedTranslationSegments(newSegments)
                                            setEditedTranslationText(newSegments.map(s => s.text).join(' '))
                                          }}
                                          className="w-full p-2 border border-gray-300 rounded text-sm resize-none dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                                          rows={Math.max(2, Math.min(4, Math.ceil(segmentText.length / 50)))}
                                          placeholder="Translation..."
                                        />
                                      </div>
                                    )
                                  })
                                })()}
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => handleSaveTranslationVersion(translation.id)}
                                  disabled={savingTranslation}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                                >
                                  {savingTranslation ? 'Saving...' : 'Save Version'}
                                </button>
                                <button
                                  onClick={handleCancelEditTranslation}
                                  disabled={savingTranslation}
                                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white border border-gray-300 rounded-lg p-4 dark:bg-gray-800 dark:border-gray-600">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {translation.translated_text || 'No translation text available'}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}

          {activeTab === 'speech-translations' && !isEditor && (
            <div className="space-y-4">
              {translations.length === 0 ? (
                <p className="text-sm text-gray-600 italic text-center py-8 dark:text-gray-300">
                  No translations available. Go to <span className="font-medium">Text Translations</span> to create translations first.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Generated speech for translations that have been promoted to speech translation:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { code: 'sp', name: 'Spanish', flag: '🇪🇸' },
                      { code: 'pr', name: 'Portuguese', flag: '🇵🇹' },
                      { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
                      { code: 'fr', name: 'French', flag: '🇫🇷' },
                      { code: 'ge', name: 'German', flag: '🇩🇪' },
                      { code: 'it', name: 'Italian', flag: '🇮🇹' },
                      { code: 'ma', name: 'Mandarin', flag: '🇨🇳' },
                      { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
                      { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
                    ].map(lang => {
                      const translation = translations.find((t: any) => t.language_code === lang.code && t.final_version_id)
                      if (!translation) return null

                      const speech = generatedSpeech.find((s: any) => 
                        s.translation_id === translation.id && 
                        s.language_code === lang.code &&
                        s.status === 'completed'
                      )
                      const isGenerating = generatingSpeech === translation.id

                      return (
                        <div key={lang.code} className="border border-gray-300 rounded-lg p-4 bg-white dark:bg-gray-800 dark:border-gray-600">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{lang.flag}</span>
                              <div>
                                <div className="font-semibold text-sm dark:text-gray-100">{lang.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{lang.code}</div>
                              </div>
                            </div>
                          </div>

                          {speech ? (
                            <div className="space-y-2">
                              <div className="border border-green-200 rounded p-2 bg-green-50 dark:bg-green-900 dark:border-green-700">
                                <div className="text-xs text-gray-600 mb-1 dark:text-gray-400">🎵 Generated Audio</div>
                                <audio controls className="w-full" src={speech.audio_url}></audio>
                                <div className="flex gap-2 mt-2">
                                  <button 
                                    onClick={() => handleDownloadSpeech(speech.audio_url, lang.code)}
                                    className="flex-1 px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 text-center"
                                  >
                                    ↓ Download Audio
                                  </button>
                                  <button 
                                    onClick={() => handleDownloadTranslationText(translation)}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 text-center"
                                  >
                                    ↓ Download Text
                                  </button>
                                  <button 
                                    onClick={() => generateSpeech(translation.id, lang.code)}
                                    disabled={isGenerating}
                                    className="flex-1 px-3 py-2 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50"
                                    title="Regenerate speech"
                                  >
                                    🔄 Re-gen
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => generateSpeech(translation.id, lang.code)}
                              disabled={isGenerating}
                              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isGenerating ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Generating...
                                </>
                              ) : (
                                '🎵 Generate Speech'
                              )}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Old translations tab and modal removed - functionality moved to Text Translations and Speech Translations tabs */}
        </div>
      )}

      {/* Find & Replace Modal */}
      {showFindReplace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) handleCancelFindReplace()
        }}>
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col dark:bg-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">🔍 Find & Replace</h3>
              <button
                onClick={handleCancelFindReplace}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Inputs */}
            <div className="p-4 border-b bg-gray-50">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Find (Live Search)
                    {findTerm.trim() && (
                      <span className="ml-2 text-xs font-normal text-purple-600">
                        ({findReplaceResults.length} match{findReplaceResults.length !== 1 ? 'es' : ''})
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={findTerm}
                    onChange={(e) => setFindTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter text to find..."
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Replace with
                  </label>
                  <input
                    type="text"
                    value={replaceTerm}
                    onChange={(e) => setReplaceTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter replacement text..."
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4">
              {findReplaceResults.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {findTerm.trim() ? (
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-sm">No matches found</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-sm">Start typing to search...</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Two-column layout */
                <div className="grid grid-cols-2 gap-4">
                  {/* Left column: Original */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 pb-2 border-b">Original</h4>
                    <div className="space-y-2">
                      {findReplaceResults.map((result, idx) => (
                        <div key={idx} className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={selectedFindReplace.has(idx)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedFindReplace)
                                if (e.target.checked) {
                                  newSelected.add(idx)
                                } else {
                                  newSelected.delete(idx)
                                }
                                setSelectedFindReplace(newSelected)
                              }}
                              className="cursor-pointer"
                            />
                            <span className="text-xs text-gray-500">
                              Segment {result.segmentIndex + 1}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800">{result.originalText}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right column: Replacement */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2 pb-2 border-b">Replacement</h4>
                    <div className="space-y-2">
                      {findReplaceResults.map((result, idx) => (
                        <div key={idx} className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-500">
                              Segment {result.segmentIndex + 1}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800">{result.replacementText}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 dark:bg-gray-900 dark:border-gray-700">
              <button
                onClick={handleCancelFindReplace}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyFindReplace}
                disabled={findReplaceResults.length === 0 || selectedFindReplace.size === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Selected ({selectedFindReplace.size})
              </button>
            </div>
          </div>
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
