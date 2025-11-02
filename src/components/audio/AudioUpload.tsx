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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', projectId)

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Server returned non-JSON response:', text.substring(0, 500))
        throw new Error(`Upload failed: Server returned ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        const errorMsg = result.error || 'Upload failed'
        const details = result.details ? ` (${result.details})` : ''
        throw new Error(errorMsg + details)
      }

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50))
        setUploadProgress(i)
      }

      onUploadComplete()
    } catch (error: any) {
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

