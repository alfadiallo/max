'use client'

import { useCallback, useEffect, useState } from 'react'

type ButtonState = 'idle' | 'running' | 'success' | 'error'

const SHORTCUT_DESCRIPTOR = '⌘⇧R'

export default function RunWorkerButton() {
  const [state, setState] = useState<ButtonState>('idle')
  const [error, setError] = useState<string | null>(null)

  const runWorker = useCallback(async () => {
    if (state === 'running') return
    setState('running')
    setError(null)

    try {
      const response = await fetch('/api/admin/rag/jobs/run', { method: 'POST' })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.ok) {
        const message = payload?.error || 'Failed to trigger worker'
        setError(message)
        setState('error')
        alert(message)
        return
      }

      setState('success')
      alert('Max RAG worker triggered. Refreshing dashboard...')
      window.location.reload()
    } catch (err: any) {
      const message = err?.message || 'Unexpected error triggering worker'
      setError(message)
      setState('error')
      alert(message)
    } finally {
      setTimeout(() => setState('idle'), 2000)
    }
  }, [state])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMetaCombo = event.metaKey && event.shiftKey && event.key.toLowerCase() === 'r'
      if (isMetaCombo) {
        event.preventDefault()
        runWorker()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [runWorker])

  const label =
    state === 'running'
      ? 'Triggering...'
      : state === 'success'
        ? 'Triggered!'
        : state === 'error'
          ? 'Try Again'
          : 'Run Worker Now'

  return (
    <div className="flex flex-col items-stretch gap-1 text-sm text-gray-600">
      <button
        type="button"
        onClick={runWorker}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={state === 'running'}
      >
        {label}
        <span className="rounded bg-green-700/70 px-2 py-0.5 text-xs font-semibold text-white">
          {SHORTCUT_DESCRIPTOR}
        </span>
      </button>
      <span className="text-xs text-gray-500">
        Keyboard: {SHORTCUT_DESCRIPTOR} to trigger
      </span>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}


