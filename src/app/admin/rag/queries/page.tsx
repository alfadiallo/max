import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface QueryEntry {
  id: string
  user_id: string
  query_text: string
  created_at: string
  total_results: number | null
  segments_returned: string[] | null
  response_time_ms: number | null
  helpful: boolean | null
  feedback_comment: string | null
}

export default async function RAGQueriesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userRole = (user.user_metadata?.role ?? '').toString().toLowerCase()
  const isInternal = ['internal', 'admin', 'superadmin'].includes(userRole)
  if (!isInternal) {
    redirect('/dashboard')
  }

  // Fetch queries with more detail
  const { data: queries } = await supabase
    .from('user_queries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const queriesList = (queries ?? []) as QueryEntry[]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto py-10 px-6 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              RAG User Queries
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Detailed view of all user searches and their outcomes.
            </p>
          </div>
          <Link
            href="/admin/rag"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg bg-white hover:bg-blue-50 dark:bg-gray-950 dark:text-blue-300 dark:border-blue-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-gray-950 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    When
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Query
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Results
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Response Time
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    Feedback
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {queriesList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No queries yet.
                    </td>
                  </tr>
                ) : (
                  queriesList.map((q) => (
                    <tr
                      key={q.id}
                      className="bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {new Date(q.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <p className="text-gray-800 dark:text-gray-200 font-medium">
                            {q.query_text}
                          </p>
                          {q.feedback_comment && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                              "{q.feedback_comment}"
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            (q.total_results ?? 0) > 0
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {q.total_results ?? 0} results
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {q.response_time_ms ? `${q.response_time_ms}ms` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {q.helpful === true && (
                          <span className="text-green-600 dark:text-green-400">👍 Helpful</span>
                        )}
                        {q.helpful === false && (
                          <span className="text-red-600 dark:text-red-400">👎 Not Helpful</span>
                        )}
                        {q.helpful === null && (
                          <span className="text-gray-400">No feedback</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-mono text-xs">
                        {q.user_id.slice(0, 8)}...
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {queriesList.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              📊 Query Analytics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Total Queries</div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {queriesList.length}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Avg Results</div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {(
                    queriesList.reduce((sum, q) => sum + (q.total_results ?? 0), 0) /
                    queriesList.length
                  ).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Helpful %</div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {queriesList.filter((q) => q.helpful === true).length > 0
                    ? (
                        (queriesList.filter((q) => q.helpful === true).length /
                          queriesList.filter((q) => q.helpful !== null).length) *
                        100
                      ).toFixed(0)
                    : 0}
                  %
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Zero Results</div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {queriesList.filter((q) => (q.total_results ?? 0) === 0).length}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

