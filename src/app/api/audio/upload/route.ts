import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Supported: MP3, WAV, M4A, WebM' },
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

    // Get project info to determine storage path
    const { data: project } = await supabase
      .from('max_projects')
      .select(`
        *,
        project_type:max_project_types(*)
      `)
      .eq('id', projectId)
      .eq('created_by', user.id)
      .single()

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    // Generate file path
    const fileExtension = file.name.split('.').pop()
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

