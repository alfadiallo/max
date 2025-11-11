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
      // Editors and Admins should see ALL projects, not just ones they created
      const userRole = user.user_metadata?.role
      const isEditor = userRole === 'Editor' || userRole === 'editor'
      const isAdmin = userRole === 'Admin' || userRole === 'admin'
      const canSeeAllProjects = isEditor || isAdmin
      
      console.log('Loading projects for user:', user.email, 'Role:', userRole, 'CanSeeAll:', canSeeAllProjects)
      
      let query = supabase
        .from('max_projects')
        .select(`
          *,
          project_type:max_project_types(*)
        `)
        .eq('archived', false)
      
      // Only filter by created_by if user is NOT an Editor or Admin
      if (!canSeeAllProjects) {
        query = query.eq('created_by', user.id)
      }
      
      const { data: projData, error: projectsError } = await query.order('created_at', { ascending: false })
      
      if (projectsError) {
        console.error('Error loading projects:', projectsError)
        alert(`Error loading projects: ${projectsError.message}`)
      } else {
        console.log('Projects loaded:', projData?.length || 0, 'projects')
      }
      
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
      {/* Global header renders via RootLayout */}
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink-dark"
          >
            + New Project
          </button>
        </div>
        {projects.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-keyelements-text">No projects yet</h2>
            <p className="text-keyelements-text-light mb-6">Upload your first audio to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink-dark"
            >
              Upload Audio
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition border border-gray-200">
                <h3 className="text-lg font-semibold mb-2 text-keyelements-text">{project.name}</h3>
                <p className="text-sm text-keyelements-text-light mb-4">{project.project_type?.name || 'Unknown'}</p>
                <Link
                  href={`/projects/${project.id}`}
                  className="text-brand-pink hover:text-brand-pink-dark"
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
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customProjectName, setCustomProjectName] = useState('')
  const supabase = createClient()

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeId = e.target.value
    
    if (typeId === 'custom') {
      setShowCustomInput(true)
      setProjectTypeId('')
      setName('')
    } else {
      setShowCustomInput(false)
      setProjectTypeId(typeId)
      
      const selectedType = projectTypes.find((t: ProjectType) => t.id === typeId)
      if (selectedType) {
        setName(selectedType.name)
      }
    }
  }

  const handleCustomProjectSubmit = async () => {
    if (!customProjectName.trim()) {
      alert('Please enter a project name')
      return
    }
    
    // Create a new project type
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: newType, error: typeError } = await supabase
      .from('max_project_types')
      .insert({
        name: customProjectName,
        slug: customProjectName.toLowerCase().replace(/\s+/g, '-'),
        archived: false
      })
      .select()
      .single()

    if (typeError) {
      alert(typeError.message)
      setLoading(false)
      return
    }

    // Create the project with the new type
    const { error } = await supabase
      .from('max_projects')
      .insert({
        name: customProjectName,
        project_type_id: newType.id,
        created_by: user.id
      })

    if (error) {
      alert(error.message)
    } else {
      onSuccess()
    }
    setLoading(false)
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
        <h2 className="text-xl font-bold mb-4">Select a project</h2>
        
        {!showCustomInput ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Project Category</label>
              <select
                required
                value={projectTypeId}
                onChange={handleTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select a project...</option>
                {projectTypes
                  .filter((type: ProjectType) => type.slug !== 'other')
                  .map((type: ProjectType) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                <option value="custom">+ Create New Project Type</option>
              </select>
            </div>
            
            {name && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-600">Project will be named:</p>
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
                disabled={loading || !projectTypeId}
                className="px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink-dark disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">New Project Name</label>
              <input
                type="text"
                value={customProjectName}
                onChange={(e) => setCustomProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter project name"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomProjectName('')
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCustomProjectSubmit}
                disabled={loading || !customProjectName.trim()}
                className="px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink-dark disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

