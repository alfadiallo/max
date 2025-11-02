'use client'

import { useState, useEffect } from 'react'

interface ContentOutput {
  id: string
  transcription_id: string
  output_type: string
  audience: string | null
  title: string
  content: string
  status: string
  created_at: string
}

export default function ContentReviewPage() {
  const [content, setContent] = useState<ContentOutput[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string>('')

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/insight/review')
      const result = await response.json()
      
      if (result.success) {
        setContent(result.data || [])
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/insight/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: newStatus
        })
      })

      const result = await response.json()
      if (result.success) {
        loadContent()
      } else {
        alert(`Failed to update: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const handleEdit = (item: ContentOutput) => {
    setEditingId(item.id)
    setEditedContent(item.content)
  }

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch('/api/insight/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          content: editedContent,
          status: 'needs_revision'
        })
      })

      const result = await response.json()
      if (result.success) {
        setEditingId(null)
        loadContent()
        alert('Content saved successfully')
      } else {
        alert(`Failed to save: ${result.error}`)
      }
    } catch (error) {
      console.error('Error saving edit:', error)
      alert('Failed to save edit')
    }
  }

  const filteredContent = filter === 'all' 
    ? content 
    : content.filter(item => item.output_type === filter)

  const contentByType = {
    email: filteredContent.filter(c => c.output_type === 'email'),
    linkedin: filteredContent.filter(c => c.output_type === 'linkedin'),
    blog: filteredContent.filter(c => c.output_type === 'blog'),
    video_clip: filteredContent.filter(c => c.output_type === 'video_clip')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Global header renders via RootLayout */}

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium ${filter === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          All ({content.length})
        </button>
        <button
          onClick={() => setFilter('email')}
          className={`px-4 py-2 font-medium ${filter === 'email' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Emails ({contentByType.email.length})
        </button>
        <button
          onClick={() => setFilter('linkedin')}
          className={`px-4 py-2 font-medium ${filter === 'linkedin' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Social Posts ({contentByType.linkedin.length})
        </button>
        <button
          onClick={() => setFilter('blog')}
          className={`px-4 py-2 font-medium ${filter === 'blog' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Blog ({contentByType.blog.length})
        </button>
        <button
          onClick={() => setFilter('video_clip')}
          className={`px-4 py-2 font-medium ${filter === 'video_clip' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Video Clips ({contentByType.video_clip.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading content...</span>
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No content found</p>
          <p className="text-sm text-gray-500 mt-2">Generate content in Insights to review it here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContent.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded">
                      {item.output_type.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      item.status === 'approved' ? 'bg-green-100 text-green-800' :
                      item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      item.status === 'needs_revision' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                    {item.audience && (
                      <span className="text-sm text-gray-500">for {item.audience}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                {editingId === item.id ? null : (
                  <div className="flex gap-2">
                    {item.status !== 'approved' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'approved')}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          ✏️ Edit
                        </button>
                      </>
                    )}
                    {item.status !== 'rejected' && item.status !== 'draft' && (
                      <button
                        onClick={() => handleStatusUpdate(item.id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        ✕ Reject
                      </button>
                    )}
                    {item.status === 'draft' && (
                      <button
                        onClick={() => handleStatusUpdate(item.id, 'approved')}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                      >
                        Mark as Approved
                      </button>
                    )}
                  </div>
                )}
              </div>

              {editingId === item.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={10}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded">
                  {item.output_type === 'blog' && item.content.startsWith('{') ? (
                    <div className="prose max-w-none">
                      {(() => {
                        try {
                          const blogStructure = JSON.parse(item.content)
                          return (
                            <div>
                              <h4 className="font-semibold mb-2">Article Structure:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {blogStructure.sections?.map((section: string, idx: number) => (
                                  <li key={idx}>{section}</li>
                                ))}
                              </ul>
                              {blogStructure.estimated_words && (
                                <p className="mt-3 text-xs text-gray-500">
                                  Estimated word count: {blogStructure.estimated_words}
                                </p>
                              )}
                            </div>
                          )
                        } catch {
                          return item.content
                        }
                      })()}
                    </div>
                  ) : item.output_type === 'video_clip' && item.content.startsWith('{') ? (
                    <div>
                      {(() => {
                        try {
                          const clipData = JSON.parse(item.content)
                          return (
                            <div className="space-y-2">
                              <p><strong>Timestamps:</strong> {clipData.timestamp_start} - {clipData.timestamp_end}</p>
                              <p><strong>Visual Approach:</strong> {clipData.visual_approach}</p>
                              <p><strong>Key Message:</strong> {clipData.key_message}</p>
                            </div>
                          )
                        } catch {
                          return item.content
                        }
                      })()}
                    </div>
                  ) : (
                    item.content
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

