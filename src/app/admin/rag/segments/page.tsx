import { Suspense } from 'react'
import SegmentsTable from './segmentsTable'

export const dynamic = 'force-dynamic'

export default function RAGSegmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-10 px-6 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Content Segments</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Inspect the indexed segments available to the RAG pipeline. Use filters to drill into specific sources or H-versions.
          </p>
        </header>

        <Suspense fallback={<div className="text-sm text-gray-500">Loading segments…</div>}>
          <SegmentsTable />
        </Suspense>
      </main>
    </div>
  )
}


