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
            <h1 className="text-2xl font-bold">Max Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Welcome back!</h2>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <p className="text-gray-600 mb-4">
              Email: {user?.email}
            </p>
            <p className="text-gray-600 mb-4">
              Full Name: {user?.user_metadata?.full_name || 'Not set'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <a href="/projects" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
              <h3 className="text-lg font-semibold mb-2">📁 Projects</h3>
              <p className="text-gray-600">Manage your audio projects</p>
            </a>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">🎤 Audio Upload</h3>
              <p className="text-gray-600">Coming soon</p>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">✅ Setup Complete!</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>Authentication working</li>
              <li>Database tables created</li>
              <li>Storage buckets ready</li>
              <li>Project management ready</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

