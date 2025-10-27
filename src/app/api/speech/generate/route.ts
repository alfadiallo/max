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

    // Check API key
    const apiKey = process.env.ELEVENLABS_API_KEY || ''
    if (!apiKey) {
      console.error('ELEVENLABS_API_KEY not found in environment')
      return NextResponse.json({ success: false, error: 'ElevenLabs API key not configured' }, { status: 500 })
    }

    // Initialize ElevenLabs client
    console.log('Initializing ElevenLabs client...')
    const elevenlabsClient = new ElevenLabsClient({
      apiKey: apiKey
    })

    // Voice mapping for each language
    const voiceMap: Record<string, string> = {
      'sp': 'ThT5KcBeYPX3keUQqHPh', // Serena - Spanish female (good quality)
      'pr': 'onwK4e9ZLuTAKqWW03F9', // Antoni - Portuguese
      'ar': 'VR6AewLTigWG4xSOukaG', // Arnold - Arabic
      'fr': 'EXAVITQu4vr4xnSDxMaL', // Bella - French
      'ge': 'ErXwobaYiN019PkySvjV', // Dorothy - German
      'it': 'MF3mGyEYCl7XYWbV9V6O', // Elli - Italian
      'ma': 'LcfcDJNUP1GQjkzn1xUU' // Gigi - Mandarin
    }
    
    // For testing with very short text to minimize token usage
    const MAX_TEST_LENGTH = process.env.ELEVENLABS_TEST_MAX_LENGTH ? parseInt(process.env.ELEVENLABS_TEST_MAX_LENGTH) : 500
    if (textToSynthesize.length > MAX_TEST_LENGTH) {
      console.log(`Text length ${textToSynthesize.length} exceeds test limit ${MAX_TEST_LENGTH}, truncating for testing...`)
      textToSynthesize = textToSynthesize.substring(0, MAX_TEST_LENGTH) + ' [truncated for testing]'
      console.log(`Truncated to ${textToSynthesize.length} characters`)
    }

    const voiceId = voiceMap[language_code] || 'pNInz6obpgDQGcFmaJgB' // Default to Adam
    console.log('Voice ID:', voiceId, 'Text length:', textToSynthesize.length)

    // Generate speech using ElevenLabs
    console.log('Calling ElevenLabs API...')
    let audioStream: ReadableStream<Uint8Array> | null = null
    
    try {
      const response = await elevenlabsClient.textToSpeech.convert(voiceId, {
        text: textToSynthesize,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      })
      
      console.log('Received response from ElevenLabs')
      console.log('Response type:', typeof response)
      console.log('Response constructor:', response.constructor.name)
      console.log('Response keys:', Object.keys(response || {}))
      console.log('Response.body exists:', !!response.body)
      console.log('Response.body type:', typeof response.body)
      
      // The response IS the readable stream based on ElevenLabs SDK
      if (response && typeof response.getReader === 'function') {
        audioStream = response as ReadableStream<Uint8Array>
        console.log('Response is directly a ReadableStream')
      } else if (response.body && typeof response.body.getReader === 'function') {
        audioStream = response.body as ReadableStream<Uint8Array>
        console.log('Response has a body that is a ReadableStream')
      } else {
        console.error('Unexpected response structure:', response)
        throw new Error('Unknown response format from ElevenLabs')
      }
    } catch (apiError: any) {
      console.error('ElevenLabs API error:', apiError)
      
      // Handle quota exceeded error
      if (apiError?.body?.detail?.status === 'quota_exceeded') {
        const message = apiError.body.detail.message
        console.error('ElevenLabs quota exceeded:', message)
        return NextResponse.json(
          { 
            success: false, 
            error: `ElevenLabs quota exceeded: ${message}`,
            quotaError: true
          }, 
          { status: 402 }
        )
      }
      
      console.error('Error type:', typeof apiError)
      console.error('Error keys:', Object.keys(apiError || {}))
      console.error('Error message:', apiError?.message)
      console.error('Error status:', apiError?.status)
      console.error('Error response:', apiError?.response)
      throw apiError
    }

    // Convert stream to buffer
    if (!audioStream) {
      return NextResponse.json(
        { success: false, error: 'Failed to get audio stream from ElevenLabs' },
        { status: 500 }
      )
    }

    console.log('Converting stream to buffer...')
    const chunks: Uint8Array[] = []
    const reader = audioStream.getReader()
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
      console.log('Read', chunks.length, 'chunks from stream')
    } catch (streamError: any) {
      console.error('Stream reading error:', streamError)
      throw streamError
    }
    
    const audioBuffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
    console.log('Audio buffer size:', audioBuffer.length, 'bytes')

    // Upload to Supabase Storage
    const fileName = `speech_${language_code}_${translation_id}_${Date.now()}.mp3`
    const filePath = `generated-speech/${fileName}`

    try {
      console.log('Uploading to Supabase Storage...')
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
      console.log('Upload successful:', uploadData?.path)

      // Get public URL
      console.log('Getting public URL...')
      const { data: urlData } = supabase.storage
        .from('max-audio')
        .getPublicUrl(filePath)
      console.log('Public URL:', urlData.publicUrl)

      // Calculate duration (rough estimate: ~150 words per minute)
      const wordCount = textToSynthesize.split(' ').length
      const estimatedDuration = Math.round((wordCount / 150) * 60)

      // Save to database
      console.log('Saving to database...')
      console.log('Translation object:', JSON.stringify(translation, null, 2))
      console.log('translation_id:', translation_id)
      console.log('translation.transcription_id:', translation.transcription_id)
      
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

        if (updateError) {
          console.error('Database update error:', updateError)
          throw updateError
        }

        console.log('Database record updated successfully')
        return NextResponse.json({ success: true, data: updatedSpeech }, { status: 200 })
      } else {
        // Create new record
        const { data: newSpeech, error: insertError } = await supabase
          .from('max_generated_speech')
          .insert({
            transcription_id: translation.transcription_id,
            translation_id: translation_id,
            translation_version_id: translation.final_version_id || null,
            language_code: language_code,
            audio_url: urlData.publicUrl,
            audio_duration_seconds: estimatedDuration,
            audio_file_size_bytes: audioBuffer.length,
            status: 'completed',
            voice_id: voiceId,
            voice_type: 'generic',
            speech_source: translation.final_version_id ? 'edited_text' : 'original_text',
            created_by: user.id
          })
          .select()
          .single()

        if (insertError) {
          console.error('Database insert error object:', insertError)
          console.error('Insert error type:', typeof insertError)
          console.error('Insert error keys:', Object.keys(insertError || {}))
          console.error('Insert error code:', insertError?.code)
          console.error('Insert error message:', insertError?.message)
          console.error('Insert error details:', insertError?.details)
          console.error('Insert error hint:', insertError?.hint)
          console.error('Full error JSON:', JSON.stringify(insertError, Object.getOwnPropertyNames(insertError), 2))
          throw insertError
        }

        console.log('Database record created successfully')
        return NextResponse.json({ success: true, data: newSpeech }, { status: 201 })
      }
    } catch (uploadError: any) {
      console.error('Upload or database error type:', typeof uploadError)
      console.error('Upload or database error keys:', Object.keys(uploadError || {}))
      console.error('Upload or database error object:', uploadError)
      console.error('Upload or database error as string:', String(uploadError))
      console.error('Error message:', uploadError?.message)
      console.error('Error stack:', uploadError?.stack)
      console.error('Full error JSON:', JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError), 2))
      return NextResponse.json(
        { success: false, error: uploadError?.message || 'Failed to save audio' },
        { status: 500 }
      )
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

