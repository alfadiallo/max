'use client'

import { useState } from 'react'

export default function ResetRAGButton() {
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    if (loading) return

    const confirmed = window.confirm(
      'This will delete all indexed segments, relevance scores, and knowledge graph data. Are you sure you want to continue?',
    )

    if (!confirmed) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/rag/reset', { method: 'POST' })
      const payload = await response.json()

      if (!response.ok || !payload?.ok) {
        alert(payload?.error || 'Failed to reset RAG data')
        return
      }

      alert('RAG data cleared. Requeue transcripts to rebuild the index.')
      window.location.reload()
    } catch (error: any) {
      alert(error?.message || 'Unexpected error resetting RAG data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Clearing…' : 'Reset RAG Data'}
    </button>
  )
}


