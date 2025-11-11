'use client'

import { useEffect, useState, type ComponentType } from 'react'
import {
  FolderOpen,
  Sparkles,
  Search,
  Bot,
  FileSearch,
  Edit3,
  Users,
  Video,
  BarChart3,
} from 'lucide-react'
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

  type LinkVariant = 'default' | 'highlight' | 'green' | 'blue'

  interface DashboardLink {
    href: string
    title: string
    description: string
    icon: ComponentType<{ className?: string }>
    variant?: LinkVariant
  }

  const contentLinks: DashboardLink[] = [
    {
      href: '/projects',
      title: 'Transcription & Translations',
      description: 'Manage your audio translations',
      icon: FolderOpen,
    },
    {
      href: '/insight/review',
      title: 'Content Review',
      description: 'Review and approve generated content',
      icon: Sparkles,
    },
    {
      href: '/insight',
      title: 'Insights',
      description: 'Transcript parsing and data management',
      icon: Search,
    },
    {
      href: '/rag',
      title: 'RAG Search',
      description: 'AI-powered semantic search across knowledge base',
      icon: Bot,
      variant: 'highlight',
    },
    {
      href: '/insight/search',
      title: 'Text Search',
      description: 'Exact text matching in transcripts',
      icon: FileSearch,
    },
    {
      href: '/corrections',
      title: 'Corrections',
      description: 'Review transcription edits and corrections',
      icon: Edit3,
    },
  ]

  const adminLinks: DashboardLink[] = [
    {
      href: '/admin/sonix/import',
      title: 'Import from Sonix',
      description: 'Import existing video transcriptions',
      icon: Video,
      variant: 'green',
    },
    {
      href: '/admin/rag',
      title: 'RAG Dashboard',
      description: 'Monitor ingestion jobs, content, and analytics',
      icon: BarChart3,
      variant: 'highlight',
    },
    {
      href: '/admin/rag/segments',
      title: 'RAG Segments',
      description: 'Inspect indexed content segments and embeddings',
      icon: FileSearch,
    },
    {
      href: '/admin/users',
      title: 'Manage Users',
      description: 'Invite and manage team members',
      icon: Users,
      variant: 'blue',
    },
  ]

  const variantClasses: Record<LinkVariant, string> = {
    default: 'bg-white shadow hover:shadow-lg border border-gray-200',
    highlight:
      'bg-white shadow hover:shadow-lg border-2 border-brand-pink',
    green:
      'bg-white shadow hover:shadow-lg border-2 border-green-400',
    blue:
      'bg-white shadow hover:shadow-lg border-2 border-blue-400',
  }

  const LinkCard = ({ link }: { link: DashboardLink }) => {
    const Icon = link.icon
    const variant = link.variant ?? 'default'

    return (
      <a
        href={link.href}
        className={`rounded-lg p-6 transition ${variantClasses[variant]}`}
      >
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-keyelements-text">
          <Icon className="h-5 w-5" />
          {link.title}
        </h3>
        <p className="text-keyelements-text-light">{link.description}</p>
      </a>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global header renders via RootLayout */}

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mt-8 space-y-10">
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-keyelements-text">Content</h2>
              <p className="text-sm text-keyelements-text-light">
                Access the core tools for managing, reviewing, and searching knowledge.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contentLinks.map((link) => (
                <LinkCard key={link.href} link={link} />
              ))}
            </div>
          </section>

          {isAdmin && (
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-keyelements-text">Admin</h2>
                <p className="text-sm text-keyelements-text-light">
                  Administrative utilities for ingestion, monitoring, and user management.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {adminLinks.map((link) => (
                  <LinkCard key={link.href} link={link} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
