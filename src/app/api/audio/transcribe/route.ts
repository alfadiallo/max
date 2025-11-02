import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// POST /api/audio/transcribe - Transcribe audio file using OpenAI Whisper
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { audio_file_id, audio_url } = body

    if (!audio_file_id || !audio_url) {
      return NextResponse.json(
        { success: false, error: 'Missing audio_file_id or audio_url' },
        { status: 400 }
      )
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local' },
        { status: 500 }
      )
    }

    // Get the original file name to preserve extension
    const { data: audioFileRecord, error: fileError } = await supabase
      .from('max_audio_files')
      .select('file_name')
      .eq('id', audio_file_id)
      .single()

    if (fileError || !audioFileRecord) {
      console.error('Error fetching audio file record:', fileError)
      // Continue with default extension if we can't get the file name
    }

    // Extract file extension from original file name, or default to .mp3
    let fileExtension = '.mp3'
    if (audioFileRecord?.file_name) {
      const parts = audioFileRecord.file_name.split('.')
      if (parts.length > 1) {
        fileExtension = '.' + parts[parts.length - 1].toLowerCase()
      }
    }

    // Download audio file from Supabase Storage
    const audioResponse = await fetch(audio_url)
    if (!audioResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to download audio file' },
        { status: 500 }
      )
    }

    const audioBlob = await audioResponse.blob()
    // Use the original file extension so OpenAI can detect the format correctly
    const audioFile = new File([audioBlob], `audio-${audio_file_id}${fileExtension}`, { type: audioBlob.type })

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    // Call OpenAI Whisper API with verbose_json for timestamps
    const startTime = Date.now()
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json', // This gives us word-level timestamps
      timestamp_granularities: ['segment', 'word'] // Enable both segment and word-level timestamps
    })
    const endTime = Date.now()
    const transcriptionTimeMs = endTime - startTime

    if (!transcription) {
      console.error('OpenAI Whisper error: No transcription returned')
      return NextResponse.json(
        { success: false, error: 'Transcription failed' },
        { status: 500 }
      )
    }

    // Store transcription with timestamps and metadata
    const metadata = {
      transcription_time_ms: transcriptionTimeMs,
      transcription_time_seconds: Math.round(transcriptionTimeMs / 1000),
      estimated_cost: 0.006, // $0.006 per minute (approximate)
      text_length: transcription.text?.length || 0,
      word_count: transcription.text?.split(' ').length || 0
    }

    // Extract timestamped segments (for video sync)
    const segments = (transcription as any).segments || []
    const words = (transcription as any).words || []

    const { data: transcriptionRecord, error: dbError } = await supabase
      .from('max_transcriptions')
      .insert({
        audio_file_id,
        transcription_type: 'T-1',
        language_code: 'en',
        raw_text: transcription.text,
        json_with_timestamps: {
          segments: segments.map((seg: any) => ({
            id: seg.id,
            seek: seg.seek,
            start: seg.start,
            end: seg.end,
            text: seg.text,
            words: seg.words || []
          })),
          words: words.map((word: any) => ({
            word: word.word,
            start: word.start,
            end: word.end
          })),
          metadata
        },
        created_by: user.id
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { success: false, error: 'Failed to save transcription' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: transcriptionRecord.id,
        text: transcriptionRecord.raw_text,
        transcription_type: transcriptionRecord.transcription_type,
        created_at: transcriptionRecord.created_at,
        metadata: {
          transcription_time: `${transcriptionTimeMs / 1000}s`,
          word_count: metadata.word_count,
          estimated_cost: `$${metadata.estimated_cost.toFixed(4)}`,
          text_length: metadata.text_length
        }
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Transcription failed',
        details: error.details || error.hint || error.code
      },
      { status: 500 }
    )
  }
}
