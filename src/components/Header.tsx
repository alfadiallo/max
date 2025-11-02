'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from './ThemeToggle'
import Breadcrumbs from './Breadcrumbs'

export function Header() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial user
    async function getUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          // Suppress AuthSessionMissingError - it's expected during SSR/initial load
          if (error.name !== 'AuthSessionMissingError') {
            console.error('Error getting user:', error)
          }
          setUser(null)
        } else {
          setUser(user)
        }
        setLoading(false)
      } catch (err: any) {
        // Suppress AuthSessionMissingError - it's expected during SSR/initial load
        if (err?.name !== 'AuthSessionMissingError') {
          console.error('Error in getUser:', err)
        }
        setUser(null)
        setLoading(false)
      }
    }
    getUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      console.log('User object:', session?.user)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Handle click outside to close profile popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false)
      }
    }

    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfile])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const isEditor = user?.user_metadata?.role === 'Editor' || user?.user_metadata?.role === 'editor'
  const logoLink = isEditor ? '/projects' : '/dashboard'

  // Debug logging
  useEffect(() => {
    console.log('Header render - user:', user?.email, 'loading:', loading, 'user object:', user)
  }, [user, loading])

  return (
    <header className="border-b border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={logoLink} className="text-xl font-bold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 whitespace-nowrap">
            Max
          </Link>
          <div className="hidden sm:block truncate">
            <Breadcrumbs />
          </div>
        </div>
        <nav className="flex items-center gap-4">
          {!isEditor && (
            <>
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hidden md:inline">
                Dashboard
              </Link>
              <Link href="/insight" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hidden md:inline">
                Insights
              </Link>
            </>
          )}
          <Link href="/projects" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hidden md:inline">
            Projects
          </Link>
          <ThemeToggle />
          {loading ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
              >
                {user.user_metadata?.full_name || user.email}
              </button>

              {/* Profile Popup */}
              {showProfile && (
                <div 
                  ref={profileRef}
                  className="absolute top-10 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-6 min-w-[300px] z-50"
                >
                  <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Profile</h3>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {user.user_metadata?.full_name || 'Not set'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {user.email}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Role</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {user.user_metadata?.role || 'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

