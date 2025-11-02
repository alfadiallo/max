import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/audio/upload - Create database record for uploaded file
// Note: File is uploaded directly to Supabase Storage from client to bypass Next.js body size limits
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

    // Support both old FormData format and new JSON metadata format
    const contentType = req.headers.get('content-type') || ''
    let projectId: string
    let file: File | null = null
    let metadata: { file_name: string; file_path: string; file_size_bytes: number; file_url?: string } | null = null

    if (contentType.includes('application/json')) {
      // New format: JSON metadata (file already uploaded to storage)
      const body = await req.json()
      projectId = body.project_id
      metadata = {
        file_name: body.file_name,
        file_path: body.file_path,
        file_size_bytes: body.file_size_bytes,
        file_url: body.file_url
      }
      
      if (!projectId || !metadata) {
        return NextResponse.json(
          { success: false, error: 'Missing project_id or file metadata' },
          { status: 400 }
        )
      }
    } else {
      // Old format: FormData (backward compatibility)
      const formData = await req.formData()
      file = formData.get('file') as File
      projectId = formData.get('project_id') as string

      if (!file || !projectId) {
        return NextResponse.json(
          { success: false, error: 'Missing file or project_id' },
          { status: 400 }
        )
      }
    }

    // Validate file type - check both MIME type and file extension
    const allowedMimeTypes = [
      // MP3 variations
      'audio/mpeg',
      'audio/mp3',
      'audio/x-mpeg-3',
      'audio/x-mp3',
      'audio/x-mpeg',
      // WAV variations
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/x-pn-wav',
      // M4A/AAC variations
      'audio/mp4',
      'audio/x-m4a',
      'audio/m4a',
      'audio/aac',
      'audio/x-aac',
      'audio/mp4a-latm',
      // WebM
      'audio/webm',
      'audio/webm;codecs=opus',
      // Other common audio formats
      'audio/ogg',
      'audio/oga',
      'audio/x-ogg',
      'audio/flac',
      'audio/x-flac'
    ]
    
    // Validate file if using old FormData format
    if (file) {
      const allowedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.webm', '.ogg', '.oga', '.flac']
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      
      const isValidMimeType = allowedMimeTypes.includes(file.type.toLowerCase())
      const isValidExtension = allowedExtensions.includes(fileExtension)
      
      if (!isValidMimeType && !isValidExtension) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid file type. Detected: ${file.type || 'unknown'} (extension: ${fileExtension}). Supported: MP3, WAV, M4A, AAC, WebM, OGG, FLAC` 
          },
          { status: 400 }
        )
      }

      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024 // 500MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: 'File too large. Max size: 500MB' },
          { status: 400 }
        )
      }
    }

    // Check if user is Editor or Admin
    const userRole = user.user_metadata?.role
    const isEditor = userRole === 'Editor' || userRole === 'editor'
    const isAdmin = userRole === 'Admin' || userRole === 'admin'

    // Get project info to determine storage path
    // Editors and Admins can upload to any project, others only to their own
    let projectQuery = supabase
      .from('max_projects')
      .select(`
        *,
        project_type:max_project_types(*)
      `)
      .eq('id', projectId)
    
    // Only filter by created_by if user is not Editor or Admin
    if (!isEditor && !isAdmin) {
      projectQuery = projectQuery.eq('created_by', user.id)
    }

    const { data: project, error: projectError } = await projectQuery.single()

    if (projectError || !project) {
      console.error('Project query error:', projectError)
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Check if project_type exists (only needed for old FormData flow)
    if (file && (!project.project_type || !project.project_type.slug)) {
      return NextResponse.json(
        { success: false, error: 'Project type not found. Please assign a project type to this project.' },
        { status: 400 }
      )
    }

    // Ensure user exists in max_users table (required for foreign key constraint)
    const adminClient = createAdminClient()
    const { error: userSyncError } = await adminClient
      .from('max_users')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (userSyncError) {
      console.error('Error syncing user to max_users:', userSyncError)
      // Continue anyway - might already exist or RLS might allow it
    }

    // Handle old FormData format (backward compatibility)
    if (file && !metadata) {
      // Generate file path
      const fileName = `${Date.now()}-${file.name}`
      const storagePath = `audio/${project.project_type!.slug}/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('max-audio')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('max-audio')
        .getPublicUrl(storagePath)

      // Create audio file record in database
      const { data: audioFile, error: dbError } = await supabase
        .from('max_audio_files')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_path: storagePath,
          file_size_bytes: file.size,
          uploaded_by: user.id
        })
        .select()
        .single()

      if (dbError) throw dbError

      return NextResponse.json({
        success: true,
        data: {
          id: audioFile.id,
          file_name: audioFile.file_name,
          file_path: audioFile.file_path,
          file_url: publicUrl,
          file_size_bytes: audioFile.file_size_bytes,
          created_at: audioFile.created_at
        }
      }, { status: 201 })
    }

    // Handle new JSON metadata format (file already uploaded to storage)
    if (metadata) {
      // Create audio file record in database
      const { data: audioFile, error: dbError } = await supabase
        .from('max_audio_files')
        .insert({
          project_id: projectId,
          file_name: metadata.file_name,
          file_path: metadata.file_path,
          file_size_bytes: metadata.file_size_bytes,
          uploaded_by: user.id
        })
        .select()
        .single()

      if (dbError) throw dbError

      return NextResponse.json({
        success: true,
        data: {
          id: audioFile.id,
          file_name: audioFile.file_name,
          file_path: audioFile.file_path,
          file_url: metadata.file_url || null,
          file_size_bytes: audioFile.file_size_bytes,
          created_at: audioFile.created_at
        }
      }, { status: 201 })
    }

    throw new Error('Invalid request format')

  } catch (error: any) {
    console.error('Upload error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Upload failed',
        details: error.details || error.hint || error.code
      },
      { status: 500 }
    )
  }
}

