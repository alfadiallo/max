import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSonixClient } from '@/lib/sonix/client'
import { convertSonixJSONToMaxFormat } from '@/lib/utils/sonixConverter'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/sonix/import
 * 
 * Import a transcript from Sonix into Max
 * 
 * Body:
 * {
 *   sonix_media_id: string (required)
 *   project_id?: string (optional - creates new audio file)
 *   audio_file_id?: string (optional - links to existing audio file)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { sonix_media_id, project_id, audio_file_id } = body

    if (!sonix_media_id) {
      return NextResponse.json(
        { success: false, error: 'Missing sonix_media_id' },
        { status: 400 }
      )
    }

    // Must provide either project_id or audio_file_id
    if (!project_id && !audio_file_id) {
      return NextResponse.json(
        { success: false, error: 'Must provide either project_id or audio_file_id' },
        { status: 400 }
      )
    }

    // Initialize Sonix client
    let sonixClient
    try {
      sonixClient = createSonixClient()
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Sonix API not configured' },
        { status: 500 }
      )
    }

    // Fetch media details and transcript from Sonix
    let sonixMedia
    let sonixTranscript

    try {
      sonixMedia = await sonixClient.getMedia(sonix_media_id)
      sonixTranscript = await sonixClient.getTranscript(sonix_media_id)
    } catch (error: any) {
      console.error('Sonix API error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch from Sonix: ${error.message}` 
        },
        { status: 500 }
      )
    }

    // Check if transcription is completed
    if (sonixMedia.status !== 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Transcription not completed. Current status: ${sonixMedia.status}` 
        },
        { status: 400 }
      )
    }

    // Convert Sonix format to Max format
    const maxFormat = convertSonixJSONToMaxFormat(sonixTranscript)

    // Get or create audio file record
    let audioFileId = audio_file_id

    if (project_id && !audio_file_id) {
      // Create new audio file record
      const adminClient = createAdminClient()

      // Get project to verify it exists and user has access
      const { data: project, error: projectError } = await supabase
        .from('max_projects')
        .select('id, project_type_id, project_type:max_project_types(slug)')
        .eq('id', project_id)
        .single()

      if (projectError || !project) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        )
      }

      // Ensure user exists in max_users (for foreign key)
      await adminClient.from('max_users').upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || null
      }, { onConflict: 'id' })

      // Get project type slug for file path
      const projectType = project.project_type as any
      const projectTypeSlug = projectType?.slug || 'default'

      // Create audio file record
      const fileName = sonixMedia.name || `sonix-${sonix_media_id}.${sonixMedia.video ? 'mp4' : 'mp3'}`
      const filePath = `audio/${projectTypeSlug}/${Date.now()}-${fileName}`

      const { data: newAudioFile, error: audioFileError } = await adminClient
        .from('max_audio_files')
        .insert({
          project_id: project_id,
          file_name: fileName,
          file_path: filePath,
          file_size_bytes: null, // Sonix doesn't provide file size
          duration_seconds: sonixMedia.duration,
          uploaded_by: user.id,
          sonix_media_id: sonix_media_id,
          file_type: sonixMedia.video ? 'video' : 'audio',
          sonix_status: 'imported'
        })
        .select()
        .single()

      if (audioFileError || !newAudioFile) {
        console.error('Error creating audio file:', audioFileError)
        return NextResponse.json(
          { success: false, error: 'Failed to create audio file record' },
          { status: 500 }
        )
      }

      audioFileId = newAudioFile.id
    } else if (audio_file_id) {
      // Verify audio file exists and update with Sonix info
      const { data: existingAudioFile, error: checkError } = await supabase
        .from('max_audio_files')
        .select('id')
        .eq('id', audio_file_id)
        .single()

      if (checkError || !existingAudioFile) {
        return NextResponse.json(
          { success: false, error: 'Audio file not found' },
          { status: 404 }
        )
      }

      // Update audio file with Sonix metadata
      await supabase
        .from('max_audio_files')
        .update({
          sonix_media_id: sonix_media_id,
          file_type: sonixMedia.video ? 'video' : 'audio',
          sonix_status: 'imported',
          duration_seconds: sonixMedia.duration
        })
        .eq('id', audio_file_id)
    }

    // Check if transcription already exists for this audio file
    const { data: existingTranscription } = await supabase
      .from('max_transcriptions')
      .select('id')
      .eq('audio_file_id', audioFileId)
      .single()

    if (existingTranscription) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transcription already exists for this audio file',
          transcription_id: existingTranscription.id
        },
        { status: 409 }
      )
    }

    // Ensure user exists in max_users (for foreign key)
    const adminClient = createAdminClient()
    await adminClient.from('max_users').upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || null
    }, { onConflict: 'id' })

    // Create transcription record
    const { data: transcription, error: transcriptionError } = await adminClient
      .from('max_transcriptions')
      .insert({
        audio_file_id: audioFileId,
        transcription_type: 'T-1',
        language_code: sonixMedia.language || 'en',
        raw_text: maxFormat.raw_text,
        json_with_timestamps: maxFormat.json_with_timestamps,
        source: 'sonix',
        created_by: user.id
      })
      .select()
      .single()

    if (transcriptionError || !transcription) {
      console.error('Error creating transcription:', transcriptionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create transcription record' },
        { status: 500 }
      )
    }

    // Get project_id for the audio file
    const { data: audioFile } = await supabase
      .from('max_audio_files')
      .select('project_id')
      .eq('id', audioFileId)
      .single()

    const finalProjectId = audioFile?.project_id || project_id || null

    return NextResponse.json({
      success: true,
      data: {
        transcription_id: transcription.id,
        audio_file_id: audioFileId,
        project_id: finalProjectId,
        sonix_media_id: sonix_media_id,
        duration: sonixMedia.duration,
        segments_count: maxFormat.json_with_timestamps.segments.length
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to import from Sonix' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sonix/import
 * 
 * List all media files from Sonix account
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (optional - can be removed if all users should access)
    const userRole = user.user_metadata?.role
    const isAdmin = userRole === 'Admin' || userRole === 'admin'

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Initialize Sonix client
    let sonixClient
    try {
      sonixClient = createSonixClient()
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Sonix API not configured' },
        { status: 500 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as 'completed' | 'transcribing' | null
    const page = parseInt(searchParams.get('page') || '1')

    // Fetch media files from Sonix
    let sonixMedia
    try {
      sonixMedia = await sonixClient.listMediaFiles({
        page,
        status: status || undefined
      })
      console.log('Sonix API response:', JSON.stringify(sonixMedia, null, 2))
    } catch (error: any) {
      console.error('Sonix API error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to fetch from Sonix API',
          details: 'Make sure SONIX_API_KEY is set correctly and your Sonix account has API access.'
        },
        { status: 500 }
      )
    }

    // Validate response structure
    // Sonix API might return media directly as array, or wrapped in a data/media property
    let mediaArray: any[] = []
    if (Array.isArray(sonixMedia)) {
      // Response is directly an array
      mediaArray = sonixMedia
    } else if (sonixMedia?.media && Array.isArray(sonixMedia.media)) {
      // Response has media property
      mediaArray = sonixMedia.media
    } else if (sonixMedia?.data && Array.isArray(sonixMedia.data)) {
      // Response has data property
      mediaArray = sonixMedia.data
    } else {
      console.error('Unexpected Sonix API response structure:', JSON.stringify(sonixMedia, null, 2))
      return NextResponse.json(
        {
          success: false,
          error: 'Unexpected response format from Sonix API',
          details: 'The API response does not contain a valid media array. Response keys: ' + Object.keys(sonixMedia || {}).join(', ')
        },
        { status: 500 }
      )
    }

    // Normalize to our expected structure
    const normalizedResponse = {
      media: mediaArray,
      total_pages: sonixMedia?.total_pages || sonixMedia?.totalPages || 1,
      page: sonixMedia?.page || page
    }

    // Check which ones are already imported
    const sonixMediaIds = normalizedResponse.media.map(m => m.id).filter((id): id is string => !!id)

    let importedMap: Record<string, string> = {}
    if (sonixMediaIds.length > 0) {
      const { data: importedFiles } = await supabase
        .from('max_audio_files')
        .select('sonix_media_id, id')
        .in('sonix_media_id', sonixMediaIds)

      if (importedFiles) {
        importedMap = importedFiles.reduce((acc, file) => {
          if (file.sonix_media_id) {
            acc[file.sonix_media_id] = file.id
          }
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Merge import status
    const mediaWithStatus = normalizedResponse.media.map(media => ({
      ...media,
      imported: !!importedMap[media.id],
      audio_file_id: importedMap[media.id] || null
    }))

    return NextResponse.json({
      success: true,
      data: {
        media: mediaWithStatus,
        total_pages: normalizedResponse.total_pages,
        page: normalizedResponse.page
      }
    })

  } catch (error: any) {
    console.error('List Sonix media error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list Sonix media' },
      { status: 500 }
    )
  }
}
