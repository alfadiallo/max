'use client'

import { useState } from 'react'

type QueueActionsProps = {
  jobId: string
  jobStatus: string
}

export default function QueueActions({ jobId, jobStatus }: QueueActionsProps) {
  const [loading, setLoading] = useState(false)

  const handleAction = async (path: string, confirmMessage?: string) => {
    if (loading) return
    if (confirmMessage && !window.confirm(confirmMessage)) return

    setLoading(true)
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result?.ok) {
        alert(result?.error || 'Operation failed')
      } else {
        window.location.reload()
      }
    } catch (error: any) {
      alert(error?.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {jobStatus === 'error' && (
        <button
          type="button"
          onClick={() => handleAction('/api/admin/rag/jobs/requeue')}
          disabled={loading}
          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Retry
        </button>
      )}
      <button
        type="button"
        onClick={() => handleAction('/api/admin/rag/jobs/delete', 'Delete this submission and all associated segments?')}
        disabled={loading}
        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Delete
      </button>
    </div>
  )
}


