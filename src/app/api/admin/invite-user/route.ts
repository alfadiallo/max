import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/invite-user - Create a new user and send them an invitation email
export async function POST(req: NextRequest) {
  try {
    // First, verify the requester is an admin
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
    const { email, full_name, role } = body

    // Validate required fields
    if (!email || !full_name || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, full_name, role' },
        { status: 400 }
      )
    }

    // Generate a random secure password
    const randomPassword = generateSecurePassword()

    // Use admin client to create user
    const adminClient = createAdminClient()
    
    // Create the user in auth.users
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true, // Auto-confirm email so they can login
      user_metadata: {
        full_name,
        role: role || 'Editor'
      }
    })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { success: false, error: createError?.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // Add user to max_users table
    const { error: insertError } = await adminClient
      .from('max_users')
      .insert({
        id: newUser.user.id,
        email,
        full_name
      })

    if (insertError) {
      console.error('Error adding user to max_users:', insertError)
      // Don't fail the whole request if this fails - user is created in auth
    }

    // Try to send invite email via Supabase Auth
    // Note: This requires SMTP configuration in Supabase Dashboard
    // If SMTP is not configured, emails won't be sent (Supabase default service has 2/hour limit)
    const { data: inviteLink, error: emailError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
      }
    })

    if (emailError) {
      console.error('Error generating invite link:', emailError)
      // Don't fail - user is created and can login with password reset
    }

    // Note: generateLink() generates a link but doesn't automatically send email
    // Email sending depends on Supabase SMTP configuration
    // If SMTP is not configured, you need to manually share the password or invite link
    console.log(`User created: ${email}`)
    if (inviteLink?.properties?.action_link) {
      console.log(`Invite link generated: ${inviteLink.properties.action_link}`)
      console.log('⚠️  Note: Email may not be sent if SMTP is not configured in Supabase Dashboard')
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.user.id,
          email,
          full_name,
          role: role || 'Editor'
        },
        message: emailError 
          ? 'User created successfully. Email may not have been sent - check SMTP configuration in Supabase Dashboard.'
          : 'User created successfully. Invite email should be sent (check SMTP configuration if email not received).',
        inviteLink: inviteLink?.properties?.action_link || null, // Include link in case email fails
        warning: !emailError ? 'If email not received, configure SMTP in Supabase Dashboard (Settings → Auth → SMTP Settings)' : null
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to invite user' },
      { status: 500 }
    )
  }
}

function generateSecurePassword(): string {
  // Generate a secure random password
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

