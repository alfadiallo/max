'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Redirect based on user role
        const userRole = user.user_metadata?.role
        if (userRole === 'Editor' || userRole === 'editor') {
          router.push('/projects')
        } else {
          router.push('/dashboard')
        }
      }
    }
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8 text-keyelements-text">
          KEY ELEMENTS - Dental Transcription Platform
        </h1>
        <p className="text-center text-xl text-keyelements-text-light mb-8">
          Professional transcription, translation, and content generation for dental education
        </p>
        <div className="text-center space-y-4">
          <div className="mt-8 space-y-4">
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-brand-pink text-white font-medium rounded-lg hover:bg-brand-pink-dark mr-4"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="inline-block px-6 py-3 bg-gray-200 text-keyelements-text font-medium rounded-lg hover:bg-gray-300"
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}

