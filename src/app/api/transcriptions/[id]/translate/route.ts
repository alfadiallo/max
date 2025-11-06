import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TRANSLATION_USER_PROMPT } from '@/lib/prompts/translation'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const transcriptionId = params.id
    const body = await req.json()
    const { language_code } = body // 'sp', 'pr', 'ar', 'fr', 'ge', 'it', 'ma'

    if (!language_code) {
      return NextResponse.json({ success: false, error: 'Missing language_code' }, { status: 400 })
    }

    // Get transcription
    const { data: transcription, error: transError } = await supabase
      .from('max_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single()

    if (transError || !transcription) {
      return NextResponse.json({ success: false, error: 'Transcription not found' }, { status: 404 })
    }

    // Check if translation already exists
    const { data: existingTranslation } = await supabase
      .from('max_translations')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .eq('language_code', language_code)
      .single()

    if (existingTranslation) {
      return NextResponse.json({ success: false, error: 'Translation already exists' }, { status: 409 })
    }

    // Get the final version text and track which version is being used
    let sourceText = transcription.raw_text
    let segments = transcription.json_with_timestamps?.segments || []
    let sourceVersionId: string | null = null // Track which H-version is used (NULL = T-1)

    // Check if there's a final version
    if (transcription.final_version_id) {
      if (transcription.final_version_id === null) {
        // T-1 is final
        sourceText = transcription.raw_text
        segments = transcription.json_with_timestamps?.segments || []
        sourceVersionId = null // T-1
      } else {
        // A version is final, fetch it
        const { data: finalVersion } = await supabase
          .from('max_transcription_versions')
          .select('*')
          .eq('id', transcription.final_version_id)
          .single()

        if (finalVersion) {
          sourceText = finalVersion.edited_text
          segments = finalVersion.json_with_timestamps?.segments || []
          sourceVersionId = transcription.final_version_id // H-version UUID
        }
      }
    }

    // Map language code to full language name
    const languageNames: Record<string, string> = {
      'sp': 'Spanish',
      'pr': 'Portuguese',
      'ar': 'Arabic',
      'fr': 'French',
      'ge': 'German',
      'it': 'Italian',
      'ma': 'Mandarin',
      'ja': 'Japanese',
      'hi': 'Hindi'
    }

    const targetLanguage = languageNames[language_code] || language_code

    // Get dictionary terms for this language
    const { data: dictionaryTerms } = await supabase
      .from('max_dictionary')
      .select('term_original, term_corrected')
      .eq('language_code', language_code)
      .order('usage_count', { ascending: false })
      .limit(50)

    // Build dictionary context
    let dictionaryContext = ''
    if (dictionaryTerms && dictionaryTerms.length > 0) {
      dictionaryContext = '\n\nIMPORTANT: Use these specific translations from our dictionary:\n'
      dictionaryTerms.forEach((term) => {
        dictionaryContext += `- "${term.term_original}" → "${term.term_corrected}"\n`
      })
    }

    // Call Claude for translation with segments
    let prompt = TRANSLATION_USER_PROMPT(sourceText, targetLanguage, language_code, segments)
    if (dictionaryContext) {
      prompt += dictionaryContext
    }
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an expert translator specializing in medical and technical content. Translate accurately while preserving structure, timestamps, and technical terminology. Return translations in the exact same segmented format as the input.`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected content type from Claude API')
    }

    const translatedText = content.text.trim()

    // Parse segmented translation (format: [start-end] text)
    // CRITICAL: We MUST maintain 1:1 segment alignment with English segments
    // Each translated segment must have the EXACT same ID, start, end, and seek as the English segment
    let translatedSegments: any[] = []
    const lines = translatedText.split('\n').filter((line: string) => line.trim())
    
    // Create a map of timestamp -> segment index for matching
    const timestampToSegmentIndex = new Map<string, number>()
    segments.forEach((seg: any, idx: number) => {
      const key = `${seg.start.toFixed(2)}-${seg.end.toFixed(2)}`
      timestampToSegmentIndex.set(key, idx)
    })
    
    let parsedCount = 0
    const parsedSegments: any[] = []
    
    lines.forEach((line: string) => {
      const timestampMatch = line.match(/\[(\d+\.?\d*)-(\d+\.?\d*)\]\s*(.*)/)
      if (timestampMatch) {
        const [, start, end, text] = timestampMatch
        const startFloat = parseFloat(start)
        const endFloat = parseFloat(end)
        
        // Find matching English segment by timestamp
        const key = `${startFloat.toFixed(2)}-${endFloat.toFixed(2)}`
        let segmentIdx = timestampToSegmentIndex.get(key)
        
        // If exact match not found, find closest by timestamp
        if (segmentIdx === undefined) {
          segmentIdx = segments.findIndex((seg: any) => 
            Math.abs(seg.start - startFloat) < 0.1 && Math.abs(seg.end - endFloat) < 0.1
          )
        }
        
        if (segmentIdx >= 0 && segmentIdx < segments.length) {
          const englishSeg = segments[segmentIdx]
          parsedSegments[segmentIdx] = {
            id: englishSeg.id, // CRITICAL: Use English segment ID
            seek: englishSeg.seek, // CRITICAL: Use English segment seek
            start: englishSeg.start, // CRITICAL: Use English segment start
            end: englishSeg.end, // CRITICAL: Use English segment end
            text: text.trim(),
            words: []
          }
          parsedCount++
        }
      }
    })

    // CRITICAL: Ensure 1:1 alignment - every English segment must have a translation segment
    // with the EXACT same ID and timestamps
    translatedSegments = segments.map((englishSeg: any, idx: number) => {
      // If we have a parsed segment for this index, use it
      if (parsedSegments[idx]) {
        return parsedSegments[idx]
      }
      
      // Otherwise, we need to extract the translation text for this segment
      // Split translation into segments based on English segment word counts
      const englishWords = segments.map((s: any) => s.text).join(' ').split(' ')
      const translationWords = translatedText.replace(/\[\d+\.?\d*-\d+\.?\d*\]\s*/g, '').split(' ').filter(w => w.trim())
      const wordRatio = englishWords.length > 0 ? translationWords.length / englishWords.length : 1
      
      // Calculate which words from translation correspond to this English segment
      const wordsBeforeThisSegment = segments.slice(0, idx).reduce((sum: number, s: any) => 
        sum + s.text.split(' ').length, 0
      )
      const segmentWordCount = englishSeg.text.split(' ').length
      const startWordIdx = Math.floor(wordsBeforeThisSegment * wordRatio)
      const endWordIdx = Math.floor((wordsBeforeThisSegment + segmentWordCount) * wordRatio)
      const translatedTextPortion = translationWords.slice(startWordIdx, endWordIdx).join(' ').trim()
      
      // CRITICAL: Always use English segment's ID, timestamps, and seek
      return {
        id: englishSeg.id, // MUST match English segment ID
        seek: englishSeg.seek, // MUST match English segment seek
        start: englishSeg.start, // MUST match English segment start timestamp
        end: englishSeg.end, // MUST match English segment end timestamp
        text: translatedTextPortion || '',
        words: []
      }
    })

    // Build full text from segments
    const fullTranslatedText = translatedSegments.map(seg => seg.text).join(' ')

    // Save to database with source version tracking
    const { data: newTranslation, error: saveError } = await supabase
      .from('max_translations')
      .insert({
        transcription_id: transcriptionId,
        language_code: language_code,
        translated_text: fullTranslatedText,
        json_with_timestamps: {
          segments: translatedSegments,
          metadata: {
            translated_at: new Date().toISOString(),
            source_language: 'en',
            target_language: language_code,
            claude_model: 'claude-sonnet-4-20250514'
          }
        },
        dictionary_corrections_applied: {},
        source_transcription_version_id: sourceVersionId, // NULL for T-1, UUID for H-version
        is_archived: false, // New translations are always current
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) throw saveError

    return NextResponse.json({ 
      success: true, 
      data: newTranslation 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Translation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to translate' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const transcriptionId = params.id

    // Get all translations for this transcription
    const { data: allTranslations, error } = await supabase
      .from('max_translations')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .order('language_code', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get source version info for translations that have source_transcription_version_id
    const sourceVersionIds = allTranslations
      ?.filter((t: any) => t.source_transcription_version_id)
      .map((t: any) => t.source_transcription_version_id) || []

    let sourceVersions: Record<string, any> = {}
    if (sourceVersionIds.length > 0) {
      const { data: versions } = await supabase
        .from('max_transcription_versions')
        .select('id, version_type, version_number')
        .in('id', sourceVersionIds)

      if (versions) {
        versions.forEach((v: any) => {
          sourceVersions[v.id] = v
        })
      }
    }

    // Attach source version info to translations
    const translationsWithSource = allTranslations?.map((translation: any) => ({
      ...translation,
      source_version: translation.source_transcription_version_id 
        ? sourceVersions[translation.source_transcription_version_id] 
        : null
    })) || []

    // For each language, get the latest non-archived translation
    // If none exist, get the latest archived one
    const translationsByLanguage: Record<string, any[]> = {}
    translationsWithSource.forEach((translation: any) => {
      const langCode = translation.language_code
      if (!translationsByLanguage[langCode]) {
        translationsByLanguage[langCode] = []
      }
      translationsByLanguage[langCode].push(translation)
    })

    // Select latest non-archived (or latest archived if no non-archived exists)
    const latestTranslations = Object.values(translationsByLanguage).map((langTranslations: any[]) => {
      // Sort by created_at descending
      const sorted = langTranslations.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      // Find latest non-archived
      const latestNonArchived = sorted.find((t: any) => !t.is_archived)
      
      // Return latest non-archived, or latest archived if no non-archived exists
      return latestNonArchived || sorted[0]
    })

    return NextResponse.json({ success: true, data: latestTranslations }, { status: 200 })

  } catch (error: any) {
    console.error('Error fetching translations:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch translations' },
      { status: 500 }
    )
  }
}

