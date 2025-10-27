import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ANALYSIS_USER_PROMPT } from '@/lib/prompts/transcription-analysis'
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
    
    // Get transcription
    const { data: transcription, error: transError } = await supabase
      .from('max_transcriptions')
      .select('*')
      .eq('id', transcriptionId)
      .single()

    if (transError || !transcription) {
      return NextResponse.json({ success: false, error: 'Transcription not found' }, { status: 404 })
    }

    // Get versions for this transcription
    const { data: versions, error: versionsError } = await supabase
      .from('max_transcription_versions')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .order('version_number', { ascending: false })

    // Get latest version text
    const sortedVersions = versions || []
    const latestVersion = sortedVersions.length > 0 ? sortedVersions[0] : null
    const transcriptText = latestVersion ? latestVersion.edited_text : transcription.raw_text

    // Call Claude for analysis
    const prompt = ANALYSIS_USER_PROMPT(transcriptText)
    
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: 'You are an expert content analyst. Return ONLY valid JSON with no additional text.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Parse Claude's response
    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('Invalid response from Claude')
    }

    let analysisResult
    try {
      analysisResult = JSON.parse(content.text)
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.text)
      throw new Error('Invalid JSON from Claude')
    }

    // Save to database
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('max_transcription_analyses')
      .insert({
        transcription_id: transcriptionId,
        transcription_version_id: latestVersion?.id || null,
        content_type: analysisResult.contentType,
        thematic_tags: analysisResult.thematicTags || [],
        key_concepts: analysisResult.keyConcepts || [],
        target_audience: analysisResult.targetAudience,
        tone: analysisResult.tone,
        duration_category: analysisResult.durationCategory,
        language_style: analysisResult.languageStyle,
        analysis_raw_text: content.text,
        confidence_scores: {},
        keywords: [],
        summary: analysisResult.summary,
        analyzed_by: user.id
      })
      .select()
      .single()

    if (saveError) throw saveError

    return NextResponse.json({ 
      success: true, 
      data: savedAnalysis 
    }, { status: 201 })

  } catch (error: any) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze transcription' },
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

    // Get existing analysis
    const { data: analysis, error } = await supabase
      .from('max_transcription_analyses')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !analysis) {
      return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: analysis })

  } catch (error: any) {
    console.error('Get analysis error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get analysis' },
      { status: 500 }
    )
  }
}

