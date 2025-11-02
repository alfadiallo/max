import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/audio/upload - Upload audio file to Supabase Storage
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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('project_id') as string

    if (!file || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing file or project_id' },
        { status: 400 }
      )
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

    const { data: project } = await projectQuery.single()

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Ensure user exists in max_users table (required for foreign key constraint)
    // Use admin client to bypass RLS since there's no INSERT policy for max_users
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

    // Generate file path
    const fileName = `${Date.now()}-${file.name}`
    const storagePath = `audio/${project.project_type.slug}/${fileName}`

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

