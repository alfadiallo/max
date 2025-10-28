'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    }
    getUser()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mt-8">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/projects" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold mb-2">📁 Transcription & Translations</h3>
              <p className="text-gray-600">Manage your audio translations</p>
            </a>
            
            <a href="/insight/review" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold mb-2">✨ Content Review</h3>
              <p className="text-gray-600">Review and approve generated content</p>
            </a>
            
            <a href="/insight" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold mb-2">🔍 Insights</h3>
              <p className="text-gray-600">Transcript parsing and data management</p>
            </a>

            <a href="/insight/search" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold mb-2">🔎 Search</h3>
              <p className="text-gray-600">Search across all transcripts</p>
            </a>

            <a href="/corrections" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold mb-2">📝 Corrections</h3>
              <p className="text-gray-600">Review transcription edits and corrections</p>
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

