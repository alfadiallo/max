'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadCloud } from 'lucide-react'

interface AudioUploadProps {
  projectId: string
  onUploadComplete: () => void
}

export default function AudioUpload({ projectId, onUploadComplete }: AudioUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      // Validate file type
      const allowedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.webm', '.ogg', '.oga', '.flac']
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      
      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(`Invalid file type: ${fileExtension}. Supported: MP3, WAV, M4A, AAC, WebM, OGG, FLAC`)
      }

      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024 // 500MB
      if (file.size > maxSize) {
        throw new Error('File too large. Max size: 500MB')
      }

      // Get project info first to determine storage path
      const { data: project, error: projectError } = await supabase
        .from('max_projects')
        .select(`
          *,
          project_type:max_project_types(*)
        `)
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        throw new Error('Project not found or access denied')
      }

      if (!project.project_type || !project.project_type.slug) {
        throw new Error('Project type not found. Please assign a project type to this project.')
      }

      // Generate file path
      const fileName = `${Date.now()}-${file.name}`
      const storagePath = `audio/${project.project_type.slug}/${fileName}`

      // Upload directly to Supabase Storage (bypasses Next.js body size limit)
      setUploadProgress(10)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('max-audio')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(uploadError.message || 'Failed to upload file to storage')
      }

      setUploadProgress(70)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('max-audio')
        .getPublicUrl(storagePath)

      setUploadProgress(80)

      // Create database record via API (small payload, just metadata)
      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          file_name: file.name,
          file_path: storagePath,
          file_size_bytes: file.size,
          file_url: publicUrl
        })
      })

      setUploadProgress(90)

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Server returned non-JSON response:', text.substring(0, 500))
        
        // Try to clean up uploaded file if database insert fails
        await supabase.storage.from('max-audio').remove([storagePath])
        
        throw new Error(`Upload failed: Server returned ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        // Try to clean up uploaded file if database insert fails
        await supabase.storage.from('max-audio').remove([storagePath])
        
        const errorMsg = result.error || 'Upload failed'
        const details = result.details ? ` (${result.details})` : ''
        throw new Error(errorMsg + details)
      }

      setUploadProgress(100)
      
      // Small delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 200))

      onUploadComplete()
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragleave' || e.type === 'dragover') {
      setDragActive(e.type !== 'dragleave')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0])
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {uploading ? (
        <div className="text-center">
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Uploading... {uploadProgress}%</p>
        </div>
      ) : (
        <div
          className={`text-center cursor-pointer ${dragActive ? 'opacity-80' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">MP3, WAV, M4A, WebM (max 500MB)</p>
          </div>
        </div>
      )}
    </div>
  )
}

