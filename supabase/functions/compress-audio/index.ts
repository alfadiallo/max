import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase automatically provides these environment variables in Edge Functions
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// For accessing Storage, we can use the anon key or create an admin client
// Since we need service role for Storage, we'll use the service role key if available
// Otherwise, we'll need to pass the audio data directly (which we're already doing)

interface CompressionRequest {
  audio_url?: string // URL to audio file in Supabase Storage
  audio_data?: string // Base64 encoded audio data
  filename?: string // Original filename
  target_size_mb?: number // Target file size in MB (default: 20)
  bitrate?: string // Opus bitrate (default: '96k')
}

/**
 * Supabase Edge Function for compressing audio files using FFmpeg
 * Uses FFmpeg.wasm for Deno compatibility
 */
serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { audio_url, audio_data, filename, target_size_mb = 20, bitrate = '96k' }: CompressionRequest = await req.json()

    if (!audio_url && !audio_data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing audio_url or audio_data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Starting audio compression...')
    console.log('Parameters:', { filename, target_size_mb, bitrate, has_url: !!audio_url, has_data: !!audio_data })

    // Get audio data
    let audioBuffer: Uint8Array
    let originalFilename = filename || 'audio.wav'

    if (audio_url) {
      // Download from Supabase Storage
      console.log('Downloading audio from:', audio_url)
      // Use anon key for public storage access, or extract from Authorization header
      const authHeader = req.headers.get('Authorization') || `Bearer ${SUPABASE_ANON_KEY}`
      const apiKey = req.headers.get('apikey') || SUPABASE_ANON_KEY
      
      const supabase = createClient(SUPABASE_URL, apiKey, {
        global: { headers: { Authorization: authHeader } }
      })
      
      const { data, error } = await supabase.storage.from('max-audio').download(audio_url.replace(/^.*\/max-audio\//, ''))
      
      if (error || !data) {
        console.error('Download error:', error)
        return new Response(
          JSON.stringify({ success: false, error: `Failed to download audio: ${error?.message || 'Unknown error'}` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      audioBuffer = new Uint8Array(await data.arrayBuffer())
      originalFilename = filename || data.name || 'audio.wav'
    } else if (audio_data) {
      // Decode base64
      audioBuffer = Uint8Array.from(atob(audio_data), c => c.charCodeAt(0))
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'No audio data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const originalSizeMB = audioBuffer.length / 1024 / 1024
    console.log(`Original file size: ${originalSizeMB.toFixed(2)}MB`)

    // Check if compression is needed
    const OPENAI_MAX_SIZE = 25 * 1024 * 1024 // 25MB
    if (audioBuffer.length <= OPENAI_MAX_SIZE) {
      console.log('File is already under 25MB, no compression needed')
      return new Response(
        JSON.stringify({
          success: true,
          compressed: false,
          audio_data: btoa(String.fromCharCode(...audioBuffer)),
          original_size: audioBuffer.length,
          compressed_size: audioBuffer.length,
          filename: originalFilename,
          extension: originalFilename.split('.').pop() || 'wav'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Use FFmpeg.wasm for Deno
    // Note: FFmpeg.wasm requires SharedArrayBuffer which needs COOP/COEP headers
    // For Edge Functions, we'll use a Deno-compatible approach
    
    try {
      // Import FFmpeg.wasm for Deno
      const { createFFmpeg, fetchFile } = await import('https://esm.sh/@ffmpeg/ffmpeg@0.12.10')
      
      const ffmpeg = createFFmpeg({ 
        log: false,
        corePath: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js'
      })
      
      console.log('Loading FFmpeg.wasm...')
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load()
      }
      
      console.log('FFmpeg loaded, compressing audio...')
      
      // Determine bitrate based on file size
      let targetBitrate = bitrate
      if (!bitrate) {
        if (originalSizeMB > 100) {
          targetBitrate = '48k'
        } else if (originalSizeMB > 50) {
          targetBitrate = '64k'
        } else {
          targetBitrate = '96k'
        }
      }
      
      // Write input file to FFmpeg's virtual filesystem
      const inputName = `input.${originalFilename.split('.').pop() || 'wav'}`
      ffmpeg.FS('writeFile', inputName, audioBuffer)
      
      // Compress to Opus/OGG
      await ffmpeg.run(
        '-i', inputName,
        '-c:a', 'libopus',
        '-b:a', targetBitrate,
        '-ar', '48000', // Opus prefers 48kHz
        'output.ogg'
      )
      
      // Read compressed file
      const compressedData = ffmpeg.FS('readFile', 'output.ogg')
      const compressedBuffer = new Uint8Array(compressedData)
      const compressedSizeMB = compressedBuffer.length / 1024 / 1024
      
      console.log(`Compression complete: ${originalSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`)
      
      // Clean up FFmpeg filesystem
      try {
        ffmpeg.FS('unlink', inputName)
        ffmpeg.FS('unlink', 'output.ogg')
      } catch (e) {
        // Ignore cleanup errors
      }
      
      // If still too large, try lower bitrate
      if (compressedBuffer.length > OPENAI_MAX_SIZE) {
        console.log('File still too large, trying lower bitrate...')
        
        if (targetBitrate !== '32k') {
          // Retry with minimum bitrate
          ffmpeg.FS('writeFile', inputName, audioBuffer)
          await ffmpeg.run(
            '-i', inputName,
            '-c:a', 'libopus',
            '-b:a', '32k',
            '-ar', '48000',
            'output.ogg'
          )
          
          const newCompressedData = ffmpeg.FS('readFile', 'output.ogg')
          const newCompressedBuffer = new Uint8Array(newCompressedData)
          const newCompressedSizeMB = newCompressedBuffer.length / 1024 / 1024
          
          console.log(`Re-compression with 32k: ${originalSizeMB.toFixed(2)}MB → ${newCompressedSizeMB.toFixed(2)}MB`)
          
          if (newCompressedBuffer.length > OPENAI_MAX_SIZE) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'File too large even after compression',
                details: `File reduced to ${newCompressedSizeMB.toFixed(2)}MB but still exceeds 25MB limit. File may be too long - consider splitting.`,
                original_size: audioBuffer.length,
                compressed_size: newCompressedBuffer.length
              }),
              { 
                status: 413, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          return new Response(
            JSON.stringify({
              success: true,
              compressed: true,
              audio_data: btoa(String.fromCharCode(...newCompressedBuffer)),
              original_size: audioBuffer.length,
              compressed_size: newCompressedBuffer.length,
              original_size_mb: originalSizeMB.toFixed(2),
              compressed_size_mb: newCompressedSizeMB.toFixed(2),
              bitrate_used: '32k',
              filename: originalFilename.replace(/\.[^/.]+$/, '.ogg'),
              extension: 'ogg'
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          compressed: true,
          audio_data: btoa(String.fromCharCode(...compressedBuffer)),
          original_size: audioBuffer.length,
          compressed_size: compressedBuffer.length,
          original_size_mb: originalSizeMB.toFixed(2),
          compressed_size_mb: compressedSizeMB.toFixed(2),
          bitrate_used: targetBitrate,
          filename: originalFilename.replace(/\.[^/.]+$/, '.ogg'),
          extension: 'ogg'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
      
    } catch (ffmpegError: any) {
      console.error('FFmpeg.wasm error:', ffmpegError)
      
      // Fallback: Return helpful error
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Compression failed in Edge Function',
          details: ffmpegError.message || 'FFmpeg.wasm not available or failed to process audio',
          suggestion: 'Please compress the file before uploading or delete and re-upload to use client-side compression.',
          original_size: audioBuffer.length,
          original_size_mb: originalSizeMB.toFixed(2)
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error: any) {
    console.error('Compression error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Compression failed',
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

