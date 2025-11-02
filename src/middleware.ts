import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user role
  const userRole = user?.user_metadata?.role

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const redirectUrl = new URL('/login', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect Editors away from dashboard to projects
  if (request.nextUrl.pathname.startsWith('/dashboard') && user && (userRole === 'Editor' || userRole === 'editor')) {
    const redirectUrl = new URL('/projects', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Restrict Editors to ONLY /projects routes (Transcription & Translations)
  // Editors cannot access: /dashboard, /insight, /rag, /corrections, /admin, etc.
  if (user && (userRole === 'Editor' || userRole === 'editor')) {
    const editorAllowedPaths = [
      '/projects',        // Transcription & Translations - ONLY allowed route
      '/login',           // Auth pages
      '/register',
      '/forgot-password', // Password reset
      '/reset-password',
      '/api',             // API routes (needed for /projects to work)
      '/'                 // Home page
    ]
    const isEditorAllowed = editorAllowedPaths.some(path => {
      if (path === '/') {
        return request.nextUrl.pathname === '/'
      }
      return request.nextUrl.pathname.startsWith(path)
    })
    
    if (!isEditorAllowed) {
      // Redirect to projects if Editor tries to access any other route
      const redirectUrl = new URL('/projects', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Allow password reset routes for everyone (unauthenticated)
  const passwordResetRoutes = ['/forgot-password', '/reset-password']
  if (passwordResetRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    return supabaseResponse
  }

  // Redirect authenticated users away from auth pages
  if ((request.nextUrl.pathname.startsWith('/login') || 
       request.nextUrl.pathname.startsWith('/register')) && user) {
    // Redirect Editors to projects, Admins to dashboard
    const redirectUrl = new URL(
      (userRole === 'Editor' || userRole === 'editor') ? '/projects' : '/dashboard',
      request.url
    )
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

