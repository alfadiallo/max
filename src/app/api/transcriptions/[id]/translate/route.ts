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

    // Get the final version text
    let sourceText = transcription.raw_text
    let segments = transcription.json_with_timestamps?.segments || []

    // Check if there's a final version
    if (transcription.final_version_id) {
      if (transcription.final_version_id === null) {
        // T-1 is final
        sourceText = transcription.raw_text
        segments = transcription.json_with_timestamps?.segments || []
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
      'ma': 'Mandarin'
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
      model: 'claude-3-5-sonnet-20240620',
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
    let translatedSegments: any[] = []
    const lines = translatedText.split('\n').filter(line => line.trim())
    
    let parsedCount = 0
    lines.forEach((line) => {
      const timestampMatch = line.match(/\[(\d+\.?\d*)-(\d+\.?\d*)\]\s*(.*)/)
      if (timestampMatch) {
        const [, start, end, text] = timestampMatch
        translatedSegments.push({
          id: segments[parsedCount]?.id || parsedCount,
          seek: segments[parsedCount]?.seek || parsedCount * 1000,
          start: parseFloat(start),
          end: parseFloat(end),
          text: text.trim(),
          words: []
        })
        parsedCount++
      }
    })

    // If parsing failed or not enough segments, fall back to splitting by English segments
    if (translatedSegments.length !== segments.length) {
      // Split translation into approximately equal parts based on English segments
      const englishWords = segments.map(seg => seg.text).join(' ').split(' ')
      const translationWords = translatedText.split(' ')
      const wordRatio = translationWords.length / englishWords.length
      
      translatedSegments = segments.map((seg, idx) => {
        // Try to find corresponding translation segment
        const existingSegment = translatedSegments.find(ts => 
          Math.abs(ts.start - seg.start) < 0.5 && Math.abs(ts.end - seg.end) < 0.5
        )
        
        if (existingSegment) {
          return existingSegment
        }
        
        // If no match, try to extract from full text based on word counts
        const segmentWords = seg.text.split(' ')
        const segmentWordCount = segmentWords.length
        const startWordIdx = segments.slice(0, idx).reduce((sum, s) => sum + s.text.split(' ').length, 0)
        const endWordIdx = startWordIdx + segmentWordCount
        
        const translatedTextPortion = translationWords.slice(
          Math.floor(startWordIdx * wordRatio),
          Math.floor(endWordIdx * wordRatio)
        ).join(' ')
        
        return {
          id: seg.id,
          seek: seg.seek,
          start: seg.start,
          end: seg.end,
          text: translatedTextPortion || translationWords.slice(
            Math.floor(idx * wordRatio),
            Math.floor((idx + 1) * wordRatio)
          ).join(' '),
          words: []
        }
      })
    }

    // Build full text from segments
    const fullTranslatedText = translatedSegments.map(seg => seg.text).join(' ')

    // Save to database
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
            claude_model: 'claude-3-5-sonnet-20240620'
          }
        },
        dictionary_corrections_applied: {},
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
    const { data: translations, error } = await supabase
      .from('max_translations')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .order('language_code', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: translations }, { status: 200 })

  } catch (error: any) {
    console.error('Error fetching translations:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch translations' },
      { status: 500 }
    )
  }
}

