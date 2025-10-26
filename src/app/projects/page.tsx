'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProjectType {
  id: string
  name: string
  slug: string
}

interface Project {
  id: string
  name: string
  project_type_id: string
  metadata: any
  created_at: string
  project_type: ProjectType
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load project types
      const { data: types } = await supabase
        .from('max_project_types')
        .select('*')
        .eq('archived', false)
      setProjectTypes(types || [])

      // Load projects
      const { data: projData } = await supabase
        .from('max_projects')
        .select(`
          *,
          project_type:max_project_types(*)
        `)
        .eq('created_by', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
      
      setProjects(projData || [])
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

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
            <h1 className="text-2xl font-bold">Projects</h1>
            <div className="space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← Back to Dashboard
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + New Project
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {projects.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">No projects yet</h2>
            <p className="text-gray-600 mb-6">Upload your first audio to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Audio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition">
                <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{project.project_type?.name || 'Unknown'}</p>
                <Link
                  href={`/projects/${project.id}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View Project →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          projectTypes={projectTypes}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  )
}

function CreateProjectModal({ projectTypes, onClose, onSuccess }: any) {
  const [name, setName] = useState('')
  const [projectTypeId, setProjectTypeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOtherName, setShowOtherName] = useState(false)
  const supabase = createClient()

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeId = e.target.value
    const selectedType = projectTypes.find((t: ProjectType) => t.id === typeId)
    
    setProjectTypeId(typeId)
    
    if (selectedType) {
      setShowOtherName(selectedType.slug === 'other')
      // Auto-fill name from project type (unless "Other")
      if (selectedType.slug !== 'other') {
        setName(selectedType.name)
      } else {
        setName('')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('max_projects')
      .insert({
        name,
        project_type_id: projectTypeId,
        created_by: user.id
      })

    if (error) {
      alert(error.message)
    } else {
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Upload Audio</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Project to Upload To</label>
            <select
              required
              value={projectTypeId}
              onChange={handleTypeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select a project...</option>
              {projectTypes.map((type: ProjectType) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          {showOtherName && (
            <div>
              <label className="block text-sm font-medium mb-2">New Project Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter project name"
              />
            </div>
          )}
          
          {!showOtherName && name && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-600">New project will be named:</p>
              <p className="font-medium">{name}</p>
            </div>
          )}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

