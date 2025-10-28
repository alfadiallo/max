import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
  try {
    const { insightMetadataId, metadata } = await request.json()

    if (!insightMetadataId || !metadata) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Update the metadata
    const { data: updatedMetadata, error: updateError } = await supabase
      .from('insight_metadata')
      .update({
        learning_objectives: metadata.learning_objectives,
        procedures_discussed: metadata.procedures_discussed,
        products_or_tools: metadata.products_or_tools,
        clinical_domain: metadata.clinical_domain,
        key_concepts: metadata.key_concepts,
        target_audience: metadata.target_audience,
        keywords: metadata.keywords,
        review_status: 'pending', // Reset to pending after edit
        updated_at: new Date().toISOString()
      })
      .eq('id', insightMetadataId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating metadata:', updateError)
      return Response.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: updatedMetadata
    })

  } catch (error: any) {
    console.error('Error in metadata update:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { insightMetadataId, action } = await request.json()

    if (!insightMetadataId || !action) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    let newStatus = 'pending'
    if (action === 'approve') {
      newStatus = 'approved'
    } else if (action === 'reject') {
      newStatus = 'rejected'
    }

    // Update the review status
    const { data: updatedMetadata, error: updateError } = await supabase
      .from('insight_metadata')
      .update({
        review_status: newStatus,
        last_reviewed_at: new Date().toISOString(),
        last_reviewed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', insightMetadataId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating review status:', updateError)
      return Response.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: updatedMetadata
    })

  } catch (error: any) {
    console.error('Error in review status update:', error)
    return Response.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    )
  }
}

