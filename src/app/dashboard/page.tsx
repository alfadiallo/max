'use client'

import { useEffect, useState } from 'react'
import { FolderOpen, Sparkles, Search, Bot, FileSearch, Edit3, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Auth error:', error)
          setLoading(false)
          router.push('/login')
        } else if (!user) {
          router.push('/login')
        } else {
          setUser(user)
          setLoading(false)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setLoading(false)
        router.push('/login')
      }
    }
    getUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  const isAdmin = user?.user_metadata?.role === 'Admin' || user?.user_metadata?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Global header renders via RootLayout */}
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mt-8">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/projects" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition dark:bg-gray-950 dark:border dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-gray-100">
                <FolderOpen className="h-5 w-5" />
                Transcription & Translations
              </h3>
              <p className="text-gray-600 dark:text-gray-300">Manage your audio translations</p>
            </a>
            
            <a href="/insight/review" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition dark:bg-gray-950 dark:border dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-gray-100">
                <Sparkles className="h-5 w-5" />
                Content Review
              </h3>
              <p className="text-gray-600 dark:text-gray-300">Review and approve generated content</p>
            </a>
            
            <a href="/insight" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition dark:bg-gray-950 dark:border dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-gray-100">
                <Search className="h-5 w-5" />
                Insights
              </h3>
              <p className="text-gray-600 dark:text-gray-300">Transcript parsing and data management</p>
            </a>

            <a href="/rag" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition border-2 border-purple-300 dark:bg-gray-950 dark:border-purple-400/40">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-gray-100">
                <Bot className="h-5 w-5" />
                RAG Search
              </h3>
              <p className="text-gray-600 dark:text-gray-300">AI-powered semantic search across knowledge base</p>
            </a>

            <a href="/insight/search" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition dark:bg-gray-950 dark:border dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-gray-100">
                <FileSearch className="h-5 w-5" />
                Text Search
              </h3>
              <p className="text-gray-600 dark:text-gray-300">Exact text matching in transcripts</p>
            </a>

            <a href="/corrections" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition dark:bg-gray-950 dark:border dark:border-gray-800">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-gray-100">
                <Edit3 className="h-5 w-5" />
                Corrections
              </h3>
              <p className="text-gray-600 dark:text-gray-300">Review transcription edits and corrections</p>
            </a>

            {isAdmin && (
              <a href="/admin/users" className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition dark:bg-gray-950 dark:border dark:border-gray-800 border-2 border-blue-300 dark:border-blue-500">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-gray-100">
                  <Users className="h-5 w-5" />
                  Manage Users
                </h3>
                <p className="text-gray-600 dark:text-gray-300">Invite and manage team members</p>
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

