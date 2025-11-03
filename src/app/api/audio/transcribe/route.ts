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

    // Download audio file from Supabase Storage with timeout
    console.log('Downloading audio file from:', audio_url)
    const downloadStartTime = Date.now()
    
    // Set a timeout for the download (30 seconds)
    const downloadController = new AbortController()
    const downloadTimeout = setTimeout(() => downloadController.abort(), 30000)
    
    let audioResponse: Response
    try {
      audioResponse = await fetch(audio_url, { 
        signal: downloadController.signal 
      })
      clearTimeout(downloadTimeout)
    } catch (fetchError: any) {
      clearTimeout(downloadTimeout)
      if (fetchError.name === 'AbortError') {
        console.error('Audio file download timed out after 30 seconds')
        return NextResponse.json(
          { 
            success: false, 
            error: 'Audio file download timed out. The file may be too large or the connection is slow.',
            details: 'Try uploading a smaller file or check your internet connection.'
          },
          { status: 504 }
        )
      }
      throw fetchError
    }
    
    if (!audioResponse.ok) {
      console.error('Failed to download audio:', audioResponse.status, audioResponse.statusText)
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to download audio file: ${audioResponse.status} ${audioResponse.statusText}` 
        },
        { status: 500 }
      )
    }

    console.log('Download completed in:', Date.now() - downloadStartTime, 'ms')
    
    // Check Content-Length header for logging (we'll compress if needed after download)
    const contentLength = audioResponse.headers.get('content-length')
    if (contentLength) {
      const sizeBytes = parseInt(contentLength, 10)
      const sizeMB = sizeBytes / 1024 / 1024
      console.log('Audio file size (from header):', sizeMB.toFixed(2), 'MB')
      // Note: Don't return error here - we'll compress server-side if needed
    }
    
    const audioBlob = await audioResponse.blob()
    const fileSizeMB = audioBlob.size / 1024 / 1024
    console.log('Audio file size (downloaded):', fileSizeMB.toFixed(2), 'MB')
    
    // Convert blob to buffer for processing
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)
    
    // Check if compression is needed (file > 25MB)
    const OPENAI_MAX_SIZE = 25 * 1024 * 1024 // 25MB in bytes
    let finalBuffer: Buffer = audioBuffer
    let finalExtension = fileExtension
    
    if (audioBuffer.length > OPENAI_MAX_SIZE) {
      console.log(`File exceeds 25MB limit (${fileSizeMB.toFixed(2)}MB), attempting compression...`)
      
      // For very large files (>200MB), Edge Function will likely fail due to memory limits
      // Direct users to use client-side compression by re-uploading
      const EDGE_FUNCTION_MEMORY_LIMIT = 200 * 1024 * 1024 // 200MB
      if (audioBuffer.length > EDGE_FUNCTION_MEMORY_LIMIT) {
        console.log(`File too large (${fileSizeMB.toFixed(2)}MB) for Edge Function compression`)
        return NextResponse.json(
          {
            success: false,
            error: 'File too large for server-side compression',
            details: `File size (${fileSizeMB.toFixed(2)}MB) exceeds server memory limits. Please delete this file and re-upload it - client-side compression will automatically compress it before upload.`,
            suggestion: 'Delete this file from the project and upload it again. The upload process will automatically compress files > 20MB before storing them.',
            original_size_mb: fileSizeMB.toFixed(2)
          },
          { status: 413 }
        )
      }
      
      try {
        // Call Supabase Edge Function for compression
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase URL or service key not configured')
        }
        
        // Convert buffer to base64 for Edge Function
        const audioBase64 = Buffer.from(audioBuffer).toString('base64')
        
        console.log('Calling compress-audio Edge Function...')
        const edgeFunctionUrl = `${supabaseUrl}/functions/v1/compress-audio`
        const compressResponse = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            audio_data: audioBase64,
            filename: audioFileRecord?.file_name || `audio${fileExtension}`,
            target_size_mb: 20
          })
        })
        
        const compressResult = await compressResponse.json()
        
        if (!compressResult.success) {
          console.error('Edge Function compression failed:', compressResult)
          console.error('Full response:', JSON.stringify(compressResult, null, 2))
          
          return NextResponse.json(
            {
              success: false,
              error: compressResult.error || 'Compression failed',
              details: compressResult.details || compressResult.suggestion || 'Failed to compress audio file. Edge Function may not support FFmpeg compression.',
              original_size_mb: fileSizeMB.toFixed(2),
              suggestion: 'Please delete this file and re-upload it. Client-side compression will automatically compress files > 20MB before upload.'
            },
            { status: compressResponse.status || 500 }
          )
        }
        
        // Decode compressed audio from base64
        const compressedBase64 = compressResult.audio_data
        const compressedBuffer = Buffer.from(compressedBase64, 'base64')
        const compressedSizeMB = compressedBuffer.length / 1024 / 1024
        
        console.log(`✅ Compression successful: ${fileSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB (bitrate: ${compressResult.bitrate_used || 'unknown'})`)
        
        finalBuffer = compressedBuffer
        finalExtension = `.${compressResult.extension || 'ogg'}` // Opus uses OGG container
        
        // Check if compression was successful (still under limit)
        if (compressedBuffer.length > OPENAI_MAX_SIZE) {
          console.error('File still too large after compression:', compressedSizeMB.toFixed(2), 'MB')
          return NextResponse.json(
            {
              success: false,
              error: `Audio file is too large even after compression. Compressed size: ${compressedSizeMB.toFixed(2)}MB, Maximum: 25MB. The audio file may be too long - please split it into smaller chunks.`,
              details: `File reduced from ${fileSizeMB.toFixed(2)}MB to ${compressedSizeMB.toFixed(2)}MB but still exceeds limit. This typically happens with very long audio files (> 2 hours).`
            },
            { status: 413 }
          )
        }
      } catch (compressionError: any) {
        console.error('❌ Compression failed:', compressionError)
        console.error('Compression error details:', compressionError.message, compressionError.stack)
        
        // Provide clear guidance for users
        return NextResponse.json(
          {
            success: false,
            error: 'Server-side compression failed',
            details: `Failed to compress audio file (${fileSizeMB.toFixed(2)}MB). Server-side compression has limitations.`,
            suggestion: 'Please delete this file and re-upload it. Client-side compression will automatically compress files > 20MB before upload, which avoids server limitations.',
            original_size_mb: fileSizeMB.toFixed(2),
            next_steps: [
              '1. Delete this audio file from the project',
              '2. Re-upload the original file',
              '3. Client-side compression will run automatically',
              '4. Transcription will work with the compressed file'
            ]
          },
          { status: 500 }
        )
      }
    }
    
    // Create File object from final buffer
    // Convert Buffer to Uint8Array for File constructor
    const uint8Array = new Uint8Array(finalBuffer)
    const audioFile = new File(
      [uint8Array],
      `audio-${audio_file_id}${finalExtension}`,
      { 
        type: finalExtension === '.ogg' ? 'audio/ogg' : 
              finalExtension === '.mp3' ? 'audio/mpeg' : 
              audioBlob.type 
      }
    )

    // Initialize OpenAI client with timeout
    const openai = new OpenAI({ 
      apiKey: OPENAI_API_KEY,
      timeout: 300000, // 5 minutes timeout for OpenAI API call
      maxRetries: 2
    })

    // Call OpenAI Whisper API with verbose_json for timestamps
    console.log('Calling OpenAI Whisper API...')
    const startTime = Date.now()
    
    let transcription
    try {
      transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        response_format: 'verbose_json', // This gives us word-level timestamps
        timestamp_granularities: ['segment', 'word'] // Enable both segment and word-level timestamps
      })
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError)
      
      // Handle specific OpenAI errors
      if (openaiError.status === 429) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'OpenAI API rate limit exceeded. Please try again in a few minutes.',
            details: openaiError.message
          },
          { status: 429 }
        )
      }
      
      if (openaiError.message?.includes('timeout') || openaiError.code === 'ECONNABORTED') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Transcription request timed out. The audio file may be too large. Try a shorter audio file or split it into smaller chunks.',
            details: openaiError.message
          },
          { status: 504 }
        )
      }
      
      if (openaiError.message?.includes('file size')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Audio file is too large for transcription. Maximum file size is 25MB. Please compress or split the file.',
            details: openaiError.message
          },
          { status: 413 }
        )
      }
      
      throw openaiError // Re-throw to be caught by outer catch
    }
    
    const endTime = Date.now()
    const transcriptionTimeMs = endTime - startTime
    console.log('Transcription completed in:', transcriptionTimeMs / 1000, 'seconds')

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
    console.error('Error type:', typeof error)
    console.error('Error stack:', error?.stack)
    
    // Provide more specific error messages
    let errorMessage = 'Transcription failed'
    let statusCode = 500
    
    if (error.message) {
      errorMessage = error.message
    }
    
    // Handle timeout errors specifically
    if (error.message?.includes('timeout') || 
        error.name === 'TimeoutError' ||
        error.code === 'ECONNABORTED') {
      errorMessage = 'Transcription request timed out. The audio file may be too large or the service is busy. Please try again or use a shorter audio file.'
      statusCode = 504
    }
    
    // Handle connection errors
    if (error.message?.includes('connection') || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection error: Unable to reach the transcription service. Please check your internet connection and try again.'
      statusCode = 503
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error.details || error.hint || error.code || 'Unknown error',
        type: error.name || 'Error'
      },
      { status: statusCode }
    )
  }
}
