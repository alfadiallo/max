'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Correction {
  id: string
  version_id: string
  transcription_id: string
  version_type: string
  version_number: number
  is_final: boolean
  audio_file_id: string
  audio_file_name: string
  audio_display_name: string
  project_name: string
  original_text: string
  corrected_text: string
  context_before: string
  context_after: string
  position_start: number
  position_end: number
  created_at: string
}

export default function CorrectionsDashboard() {
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAudioFile, setFilterAudioFile] = useState<string>('')
  const [selectedCorrection, setSelectedCorrection] = useState<Correction | null>(null)

  useEffect(() => {
    loadCorrections()
  }, [filterAudioFile])

  const loadCorrections = async () => {
    try {
      const url = filterAudioFile 
        ? `/api/corrections?audio_file_id=${filterAudioFile}`
        : '/api/corrections'
      
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success) {
        setCorrections(result.data)
      }
    } catch (error) {
      console.error('Error loading corrections:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique audio files for filtering
  const audioFiles = Array.from(new Set(corrections.map(c => c.audio_display_name))).sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading corrections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Global header renders via RootLayout */}

        {/* Filter */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Audio File:
          </label>
          <select
            value={filterAudioFile}
            onChange={(e) => setFilterAudioFile(e.target.value)}
            className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Files</option>
            {audioFiles.map(file => (
              <option key={file} value={file}>{file}</option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Corrections</p>
            <p className="text-2xl font-bold text-gray-900">{corrections.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Audio Files</p>
            <p className="text-2xl font-bold text-gray-900">{audioFiles.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Final Versions</p>
            <p className="text-2xl font-bold text-gray-900">
              {corrections.filter(c => c.is_final).length}
            </p>
          </div>
        </div>

        {/* Corrections Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Audio File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Corrected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Context
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Final
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {corrections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No corrections found. Start editing transcriptions to see corrections here.
                    </td>
                  </tr>
                ) : (
                  corrections.map((correction) => (
                    <tr 
                      key={correction.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCorrection(correction)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {correction.audio_display_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {correction.project_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {correction.version_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-red-600 line-through">
                          {correction.original_text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-green-600 font-medium">
                          {correction.corrected_text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-500 max-w-xs truncate">
                          ...{correction.context_before} 
                          <span className="font-bold">{correction.original_text}</span>
                          {correction.context_after}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {correction.is_final ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Final
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Modal */}
        {selectedCorrection && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setSelectedCorrection(null)}>
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 shadow-lg rounded-md bg-white">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">Correction Details</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Audio File</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCorrection.audio_display_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Version</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedCorrection.version_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Original Text</label>
                  <p className="mt-1 text-sm text-red-600 line-through">{selectedCorrection.original_text}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Corrected Text</label>
                  <p className="mt-1 text-sm text-green-600 font-medium">{selectedCorrection.corrected_text}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Context</label>
                  <p className="mt-1 text-sm text-gray-900">
                    ...{selectedCorrection.context_before} 
                    <span className="font-bold text-red-600 line-through">{selectedCorrection.original_text}</span>
                    <ArrowRight className="inline-block w-4 h-4 mx-1 text-green-600" /><span className="font-bold text-green-600">{selectedCorrection.corrected_text}</span>
                    {selectedCorrection.context_after}...
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedCorrection.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCorrection(null)}
                className="mt-6 px-4 py-2 bg-brand-pink text-white rounded hover:bg-brand-pink-dark"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

