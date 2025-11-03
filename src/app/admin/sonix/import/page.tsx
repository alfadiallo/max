'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SonixMedia {
  id: string
  name: string
  duration: number
  language: string
  video: boolean
  created_at: number
  status: string
  imported?: boolean
  audio_file_id?: string | null
  project_id?: string | null
}

export default function SonixImportPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [media, setMedia] = useState<SonixMedia[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          router.push('/login')
        } else if (!user) {
          router.push('/login')
        } else {
          // Check if user is admin
          const userRole = user.user_metadata?.role
          if (userRole !== 'Admin' && userRole !== 'admin') {
            router.push('/dashboard')
          } else {
            setUser(user)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        router.push('/login')
      }
    }
    getUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (user) {
      loadProjects()
      loadSonixMedia()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('max_projects')
        .select('id, name')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        setProjects(data)
        if (data.length > 0 && !projectId) {
          setProjectId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const loadSonixMedia = async () => {
    setLoadingMedia(true)
    setMessage(null)

    try {
      const response = await fetch('/api/sonix/import?status=completed')
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response from API:', text.substring(0, 500))
        throw new Error(`Server returned ${response.status} ${response.statusText}. Make sure SONIX_API_KEY is configured in Vercel environment variables.`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || result.details || 'Failed to load Sonix media')
      }

      setMedia(result.data?.media || [])
    } catch (error: any) {
      console.error('Error loading Sonix media:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load Sonix media. Make sure SONIX_API_KEY is configured.'
      })
    } finally {
      setLoadingMedia(false)
    }
  }

  const handleSelectMedia = (mediaId: string) => {
    const newSelected = new Set(selectedMedia)
    if (newSelected.has(mediaId)) {
      newSelected.delete(mediaId)
    } else {
      newSelected.add(mediaId)
    }
    setSelectedMedia(newSelected)
  }

  const handleSelectAll = () => {
    const notImported = (media || []).filter(m => !m.imported && m.status === 'completed')
    if (selectedMedia.size === notImported.length) {
      setSelectedMedia(new Set())
    } else {
      setSelectedMedia(new Set(notImported.map(m => m.id)))
    }
  }

  const handleImport = async (mediaId: string) => {
    if (!projectId) {
      setMessage({ type: 'error', text: 'Please select a project' })
      return
    }

    setImporting(prev => new Set(prev).add(mediaId))
    setMessage(null)

    try {
      const response = await fetch('/api/sonix/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sonix_media_id: mediaId,
          project_id: projectId
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Import failed')
      }

      // Update media list
      setMedia(prev => (prev || []).map(m => 
        m.id === mediaId 
          ? { 
              ...m, 
              imported: true, 
              audio_file_id: result.data.audio_file_id,
              project_id: result.data.project_id
            }
          : m
      ))

      setMessage({
        type: 'success',
        text: `Successfully imported "${(media || []).find(m => m.id === mediaId)?.name || 'media file'}"`
      })

      // Clear selection
      setSelectedMedia(prev => {
        const next = new Set(prev)
        next.delete(mediaId)
        return next
      })
    } catch (error: any) {
      console.error('Import error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to import media'
      })
    } finally {
      setImporting(prev => {
        const next = new Set(prev)
        next.delete(mediaId)
        return next
      })
    }
  }

  const handleBulkImport = async () => {
    if (selectedMedia.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one media file' })
      return
    }

    if (!projectId) {
      setMessage({ type: 'error', text: 'Please select a project' })
      return
    }

    const toImport = Array.from(selectedMedia)
    setMessage(null)

    for (const mediaId of toImport) {
      await handleImport(mediaId)
      // Small delay between imports to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setSelectedMedia(new Set())
    setMessage({
      type: 'success',
      text: `Successfully imported ${toImport.length} media file(s)`
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  const notImported = media.filter(m => !m.imported && m.status === 'completed')

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Import from Sonix</h1>
        <p className="text-gray-600">Import existing transcriptions from your Sonix account</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 rounded-lg dark:bg-gray-800 dark:border dark:border-gray-700">
        <label className="block mb-2 font-medium dark:text-gray-200">
          Select Project:
        </label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        >
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={loadSonixMedia}
          disabled={loadingMedia}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loadingMedia ? 'Loading...' : 'Refresh List'}
        </button>

        {selectedMedia.size > 0 && (
          <button
            onClick={handleBulkImport}
            disabled={!projectId || importing.size > 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Import Selected ({selectedMedia.size})
          </button>
        )}
      </div>

      {loadingMedia ? (
        <p className="text-gray-600">Loading Sonix media...</p>
      ) : media.length === 0 ? (
        <div className="p-8 text-center text-gray-600 bg-gray-50 rounded dark:bg-gray-800 dark:text-gray-300">
          <p>No media files found in Sonix account.</p>
          <p className="text-sm mt-2">Make sure SONIX_API_KEY is configured correctly.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedMedia.size === notImported.length && notImported.length > 0}
                onChange={handleSelectAll}
                className="mr-2"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Select all ({notImported.length} not imported)
              </span>
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="border border-gray-300 dark:border-gray-700 p-2 text-left dark:text-gray-200">Select</th>
                  <th className="border border-gray-300 dark:border-gray-700 p-2 text-left dark:text-gray-200">Name</th>
                  <th className="border border-gray-300 dark:border-gray-700 p-2 text-left dark:text-gray-200">Type</th>
                  <th className="border border-gray-300 dark:border-gray-700 p-2 text-left dark:text-gray-200">Duration</th>
                  <th className="border border-gray-300 dark:border-gray-700 p-2 text-left dark:text-gray-200">Language</th>
                  <th className="border border-gray-300 dark:border-gray-700 p-2 text-left dark:text-gray-200">Created</th>
                  <th className="border border-gray-300 dark:border-gray-700 p-2 text-left dark:text-gray-200">Status</th>
                  <th className="border border-gray-300 dark:border-gray-700 p-2 text-left dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(media || []).map((item) => (
                  <tr key={item.id} className={item.imported ? 'bg-green-50 dark:bg-green-900/20' : ''}>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">
                      {!item.imported && item.status === 'completed' && (
                        <input
                          type="checkbox"
                          checked={selectedMedia.has(item.id)}
                          onChange={() => handleSelectMedia(item.id)}
                          className="cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 dark:text-gray-200">{item.name}</td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 dark:text-gray-200">
                      {item.video ? '📹 Video' : '🎵 Audio'}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 dark:text-gray-200">
                      {formatDuration(item.duration)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 dark:text-gray-200 uppercase">
                      {item.language}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 dark:text-gray-200">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2 dark:text-gray-200">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.imported 
                          ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                          : item.status === 'completed'
                          ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                          : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {item.imported ? '✓ Imported' : item.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-2">
                      {item.imported ? (
                        item.project_id ? (
                          <Link
                            href={`/projects/${item.project_id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            View Project
                          </Link>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )
                      ) : item.status === 'completed' ? (
                        <button
                          onClick={() => handleImport(item.id)}
                          disabled={importing.has(item.id) || !projectId}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {importing.has(item.id) ? 'Importing...' : 'Import'}
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">
                          {item.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
