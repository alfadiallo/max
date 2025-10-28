'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import AudioUpload from '@/components/audio/AudioUpload'
import AudioPlayer from '@/components/audio/AudioPlayer'
import TranscriptionView from '@/components/audio/TranscriptionView'

interface Project {
  id: string
  name: string
  project_type_id: string
  metadata: any
  created_at: string
  project_type: {
    id: string
    name: string
    slug: string
  }
}

interface AudioFile {
  id: string
  file_name: string
  display_name?: string | null
  file_path: string
  file_size_bytes: number
  duration_seconds: number | null
  created_at: string
  file_url?: string
  transcription_status?: 'pending' | 'completed' | 'failed'
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [transcribingFiles, setTranscribingFiles] = useState<Set<string>>(new Set())
  const [editingDisplayName, setEditingDisplayName] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleTranscribe = async (audioFile: AudioFile) => {
    if (!audioFile.file_url) return
    
    setTranscribingFiles(prev => new Set(prev).add(audioFile.id))
    
    try {
      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_file_id: audioFile.id,
          audio_url: audioFile.file_url
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('Transcription complete!')
        // Reload audio files to show transcription
        await loadAudioFiles()
      } else {
        alert(`Transcription failed: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Transcription error: ${error.message}`)
    } finally {
      setTranscribingFiles(prev => {
        const next = new Set(prev)
        next.delete(audioFile.id)
        return next
      })
    }
  }

  const handleDelete = async (audioFile: AudioFile) => {
    if (!confirm(`Are you sure you want to delete "${audioFile.file_name}"? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/audio/delete?id=${audioFile.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        // Reload audio files
        await loadAudioFiles()
      } else {
        alert(`Delete failed: ${result.error}`)
      }
    } catch (error: any) {
      alert(`Delete error: ${error.message}`)
    }
  }

  const handleEditDisplayName = (file: AudioFile) => {
    setEditingDisplayName(file.id)
    setEditingValue(file.display_name || file.file_name)
  }

  const handleSaveDisplayName = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('max_audio_files')
        .update({ display_name: editingValue })
        .eq('id', fileId)

      if (error) throw error

      await loadAudioFiles()
      setEditingDisplayName(null)
    } catch (error: any) {
      alert(`Failed to update display name: ${error.message}`)
    }
  }

  const handleCancelEdit = () => {
    setEditingDisplayName(null)
    setEditingValue('')
  }

  const loadAudioFiles = async () => {
    try {
      const { data: audioData, error } = await supabase
        .from('max_audio_files')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      
      if (!error && audioData) {
        // Add public URLs for each audio file
        const filesWithUrls = audioData.map(file => ({
          ...file,
          file_url: supabase.storage.from('max-audio').getPublicUrl(file.file_path).data.publicUrl
        }))
        setAudioFiles(filesWithUrls)
      }
    } catch (error) {
      console.error('Error loading audio files:', error)
    }
  }

  useEffect(() => {
    async function loadProject() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load project
      const { data: projData, error } = await supabase
        .from('max_projects')
        .select(`
          *,
          project_type:max_project_types(*)
        `)
        .eq('id', projectId)
        .eq('created_by', user.id)
        .single()

      if (error || !projData) {
        router.push('/projects')
        return
      }

      setProject(projData)
      await loadAudioFiles()
      setLoading(false)
    }
    loadProject()
  }, [projectId, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start py-4">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Link href="/projects" className="text-gray-600 hover:text-gray-900 mt-1 inline-block">
                ← Back to Projects
              </Link>
            </div>
            <button 
              onClick={() => setShowUpload(!showUpload)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showUpload ? '✕ Cancel' : '+ Upload Audio'}
            </button>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Project Details</h2>
          <div className="space-y-2">
            <p className="text-gray-600">
              <span className="font-medium">Type:</span> {project.project_type?.name}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Created:</span> {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Upload Audio</h2>
            <AudioUpload 
              projectId={projectId} 
              onUploadComplete={async () => {
                await loadAudioFiles()
                setShowUpload(false)
              }}
            />
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Audio Files</h2>

          {audioFiles.length === 0 && !showUpload ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No audio files yet</p>
              <button 
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Upload First Audio File
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {audioFiles.map((file) => (
                <div key={file.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      {editingDisplayName === file.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') handleSaveDisplayName(file.id)
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                          />
                          <button
                            onClick={() => handleSaveDisplayName(file.id)}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 mr-2"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <p className="font-medium cursor-pointer hover:text-blue-600" onClick={() => handleEditDisplayName(file)}>
                          {file.display_name || file.file_name}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        File name: {file.file_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                        {file.duration_seconds && ` • ${Math.floor(file.duration_seconds)}s`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded: {new Date(file.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleTranscribe(file)}
                        disabled={transcribingFiles.has(file.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {transcribingFiles.has(file.id) && (
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {transcribingFiles.has(file.id) ? 'Transcribing...' : 'Transcribe →'}
                      </button>
                      <button 
                        onClick={() => handleDelete(file)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {transcribingFiles.has(file.id) && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing transcription... This may take a minute or two.</span>
                    </div>
                  )}
                  {file.file_url && (
                    <AudioPlayer audioUrl={file.file_url} fileName={file.file_name} />
                  )}
                  <TranscriptionView audioFileId={file.id} audioDuration={file.duration_seconds} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

