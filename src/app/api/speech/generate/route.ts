import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { translation_id, language_code } = body

    console.log('Speech generation request:', { translation_id, language_code })

    if (!translation_id || !language_code) {
      return NextResponse.json({ success: false, error: 'Missing translation_id or language_code' }, { status: 400 })
    }

    // Get translation first
    const { data: translation, error: transError } = await supabase
      .from('max_translations')
      .select('*')
      .eq('id', translation_id)
      .single()

    if (transError) {
      console.error('Translation query error:', transError)
      return NextResponse.json({ success: false, error: 'Translation not found' }, { status: 404 })
    }

    if (!translation) {
      console.error('Translation not found for ID:', translation_id)
      return NextResponse.json({ success: false, error: 'Translation not found' }, { status: 404 })
    }

    // Get versions if final_version_id exists
    let textToSynthesize = translation.translated_text
    let segments = translation.json_with_timestamps?.segments || []

    // Use final version if it exists
    if (translation.final_version_id) {
      const { data: finalVersion, error: versionError } = await supabase
        .from('max_translation_versions')
        .select('*')
        .eq('id', translation.final_version_id)
        .single()

      if (!versionError && finalVersion) {
        textToSynthesize = finalVersion.edited_text
        segments = finalVersion.json_with_timestamps?.segments || []
      }
    }

    if (!textToSynthesize) {
      return NextResponse.json({ success: false, error: 'No text to synthesize' }, { status: 400 })
    }

    // Check if speech already exists
    const { data: existingSpeech, error: existingError } = await supabase
      .from('max_generated_speech')
      .select('*')
      .eq('translation_id', translation_id)
      .eq('language_code', language_code)
      .single()

    // If it exists and is completed, return it
    if (existingSpeech && existingSpeech.status === 'completed') {
      return NextResponse.json({ success: true, data: existingSpeech }, { status: 200 })
    }

    // Initialize ElevenLabs client
    const elevenlabsClient = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY || ''
    })

    // Voice mapping for each language
    const voiceMap: Record<string, string> = {
      'sp': 'pNInz6obpgDQGcFmaJgB', // Adam - Spanish
      'pr': 'onwK4e9ZLuTAKqWW03F9', // Antoni - Portuguese
      'ar': 'VR6AewLTigWG4xSOukaG', // Arnold - Arabic
      'fr': 'EXAVITQu4vr4xnSDxMaL', // Bella - French
      'ge': 'ErXwobaYiN019PkySvjV', // Dorothy - German
      'it': 'MF3mGyEYCl7XYWbV9V6O', // Elli - Italian
      'ma': 'LcfcDJNUP1GQjkzn1xUU' // Gigi - Mandarin
    }

    const voiceId = voiceMap[language_code] || 'pNInz6obpgDQGcFmaJgB' // Default to Adam

    // Generate speech using ElevenLabs
    const audioStream = await elevenlabsClient.textToSpeech.convert(voiceId, {
      text: textToSynthesize,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
        style: 0.0,
        use_speaker_boost: true
      }
    })

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    const reader = audioStream.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) chunks.push(value)
    }
    
    const audioBuffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))

    // Upload to Supabase Storage
    const fileName = `speech_${language_code}_${translation_id}_${Date.now()}.mp3`
    const filePath = `generated-speech/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('max-audio')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ success: false, error: 'Failed to upload audio' }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('max-audio')
      .getPublicUrl(filePath)

    // Calculate duration (rough estimate: ~150 words per minute)
    const wordCount = textToSynthesize.split(' ').length
    const estimatedDuration = Math.round((wordCount / 150) * 60)

    // Save to database
    if (existingSpeech) {
      // Update existing record
      const { data: updatedSpeech, error: updateError } = await supabase
        .from('max_generated_speech')
        .update({
          audio_url: urlData.publicUrl,
          audio_duration_seconds: estimatedDuration,
          audio_file_size_bytes: audioBuffer.length,
          status: 'completed',
          voice_id: voiceId,
          voice_type: 'generic',
          speech_source: translation.final_version_id ? 'edited_text' : 'original_text'
        })
        .eq('id', existingSpeech.id)
        .select()
        .single()

      if (updateError) throw updateError

      return NextResponse.json({ success: true, data: updatedSpeech }, { status: 200 })
    } else {
      // Create new record
      const { data: newSpeech, error: insertError } = await supabase
        .from('max_generated_speech')
        .insert({
          transcription_id: translation.transcription_id,
          translation_id: translation_id,
          language_code: language_code,
          audio_url: urlData.publicUrl,
          audio_duration_seconds: estimatedDuration,
          audio_file_size_bytes: audioBuffer.length,
          status: 'completed',
          voice_id: voiceId,
          voice_name: voiceMap[language_code] || 'Adam',
          voice_type: 'generic',
          speech_source: translation.final_version_id ? 'edited_text' : 'original_text',
          created_by: user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      return NextResponse.json({ success: true, data: newSpeech }, { status: 201 })
    }

  } catch (error: any) {
    console.error('Speech generation error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate speech' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const translationId = req.nextUrl.searchParams.get('translation_id')
    if (!translationId) {
      return NextResponse.json({ success: false, error: 'Missing translation_id' }, { status: 400 })
    }

    const { data: speechFiles, error } = await supabase
      .from('max_generated_speech')
      .select('*')
      .eq('translation_id', translationId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: speechFiles }, { status: 200 })

  } catch (error: any) {
    console.error('Error fetching speech files:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch speech files' },
      { status: 500 }
    )
  }
}

