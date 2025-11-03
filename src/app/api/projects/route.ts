import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects - List all projects for authenticated user
export async function GET(req: NextRequest) {
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

    // Get projects with project types
    // Editors and Admins should see ALL projects, not just ones they created
    const userRole = user.user_metadata?.role
    const isEditor = userRole === 'Editor' || userRole === 'editor'
    const isAdmin = userRole === 'Admin' || userRole === 'admin'
    const canSeeAllProjects = isEditor || isAdmin
    
    let query = supabase
      .from('max_projects')
      .select(`
        *,
        project_type:max_project_types(*)
      `)
      .eq('archived', false)
    
    // Only filter by created_by if user is NOT an Editor or Admin
    if (!canSeeAllProjects) {
      query = query.eq('created_by', user.id)
    }
    
    const { data: projects, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: projects || []
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project
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
    const { name, project_type_id, metadata } = body

    // Validate required fields
    if (!name || !project_type_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, project_type_id' },
        { status: 400 }
      )
    }

    // Create project
    const { data: project, error } = await supabase
      .from('max_projects')
      .insert({
        name,
        project_type_id,
        metadata: metadata || {},
        created_by: user.id
      })
      .select(`
        *,
        project_type:max_project_types(*)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: project
    }, { status: 201 })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create project' },
      { status: 500 }
    )
  }
}

