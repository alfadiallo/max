import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/projects/types - Get all project types
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get project types
    const { data: projectTypes, error } = await supabase
      .from('max_project_types')
      .select('*')
      .eq('archived', false)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: projectTypes || []
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch project types' },
      { status: 500 }
    )
  }
}

