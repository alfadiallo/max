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

    // Call Claude for translation
    const prompt = TRANSLATION_USER_PROMPT(sourceText, targetLanguage, language_code)
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4096,
      system: `You are an expert translator specializing in medical and technical content. Translate accurately while preserving structure, timestamps, and technical terminology.`,
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

    // Parse translated text back into segments (this is a simplified version)
    // For now, we'll store the full text and let users edit it later
    const translatedSegments = segments.map((seg: any) => ({
      id: seg.id,
      seek: seg.seek,
      start: seg.start,
      end: seg.end,
      text: translatedText, // Simplified - will need better parsing
      words: seg.words || []
    }))

    // Save to database
    const { data: newTranslation, error: saveError } = await supabase
      .from('max_translations')
      .insert({
        transcription_id: transcriptionId,
        language_code: language_code,
        translated_text: translatedText,
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

