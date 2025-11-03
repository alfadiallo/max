import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/users - List all users
export async function GET(req: NextRequest) {
  try {
    // Verify the requester is an admin
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const userRole = user.user_metadata?.role
    if (userRole !== 'Admin' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required' },
        { status: 403 }
      )
    }

    // Use admin client to list users
    const adminClient = createAdminClient()
    
    // Get all users from auth.users
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json(
        { success: false, error: listError.message || 'Failed to list users' },
        { status: 500 }
      )
    }

    // Get all users from max_users table
    const { data: maxUsers, error: maxUsersError } = await adminClient
      .from('max_users')
      .select('id, email, full_name')
    
    if (maxUsersError) {
      console.error('Error fetching max_users:', maxUsersError)
      // Continue anyway - this is not critical
    }

    // Create a map of max_users by id for quick lookup
    const maxUsersMap = new Map(
      (maxUsers || []).map(u => [u.id, u])
    )

    // Combine auth.users with max_users data
    const usersWithDetails = (users || []).map(authUser => {
      const maxUser = maxUsersMap.get(authUser.id)
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || maxUser?.full_name || '',
        role: authUser.user_metadata?.role || null,
        email_confirmed_at: authUser.email_confirmed_at,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        in_max_users: !!maxUser
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithDetails
      }
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list users' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users - Update an existing user's role and sync to max_users
export async function PATCH(req: NextRequest) {
  try {
    // Verify the requester is an admin
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const userRole = user.user_metadata?.role
    if (userRole !== 'Admin' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin role required' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { userId, role, full_name } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: userId' },
        { status: 400 }
      )
    }

    if (!role || !['Editor', 'Admin'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be "Editor" or "Admin"' },
        { status: 400 }
      )
    }

    // Use admin client to update user
    const adminClient = createAdminClient()
    
    // Get existing user metadata
    const { data: { user: existingUser }, error: getUserError } = await adminClient.auth.admin.getUserById(userId)
    
    if (getUserError || !existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user metadata with role
    const existingMetadata = existingUser.user_metadata || {}
    const updatedMetadata = {
      ...existingMetadata,
      role,
      full_name: full_name || existingMetadata.full_name || existingUser.email?.split('@')[0] || ''
    }

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        user_metadata: updatedMetadata
      }
    )

    if (updateError || !updatedUser.user) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Failed to update user' },
        { status: 500 }
      )
    }

    // Ensure user exists in max_users table
    const { error: upsertError } = await adminClient
      .from('max_users')
      .upsert({
        id: userId,
        email: updatedUser.user.email,
        full_name: updatedMetadata.full_name
      }, {
        onConflict: 'id'
      })

    if (upsertError) {
      console.error('Error syncing user to max_users:', upsertError)
      // Don't fail the whole request if this fails - role is updated
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
          full_name: updatedMetadata.full_name,
          role
        },
        message: 'User role updated successfully'
      }
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    )
  }
}

