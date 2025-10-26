import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

serve(async (req) => {
  try {
    const { audio_url, language } = await req.json()

    if (!audio_url) {
      return new Response(
        JSON.stringify({ error: 'Missing audio_url' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Download audio file
    const audioResponse = await fetch(audio_url)
    const audioBlob = await audioResponse.blob()

    // Call OpenAI Whisper API
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('language', language || 'en')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    })

    const whisperData = await whisperResponse.json()

    if (!whisperResponse.ok) {
      return new Response(
        JSON.stringify({ error: whisperData.error?.message || 'Transcription failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ text: whisperData.text }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Transcription failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

