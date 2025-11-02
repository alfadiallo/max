'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function titleForSegment(segment: string): string {
  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    projects: 'Projects',
    insight: 'Insights',
    rag: 'RAG',
    corrections: 'Corrections',
    review: 'Review',
    search: 'Search',
  }
  return map[segment] || segment.replace(/-/g, ' ').replace(/^\w/, (m) => m.toUpperCase())
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const [dynamicTitles, setDynamicTitles] = useState<Record<string, string>>({})
  const supabase = createClient()

  const segments = useMemo(() => {
    const path = pathname || '/'
    return path.split('/').filter(Boolean)
  }, [pathname])

  // Load dynamic titles for known dynamic routes (e.g., projects/[id])
  useEffect(() => {
    async function loadDynamic() {
      const entries: Record<string, string> = {}
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        if (segments[i - 1] === 'projects' && seg && seg.length > 10) {
          const { data } = await supabase
            .from('max_projects')
            .select('name')
            .eq('id', seg)
            .single()
          if (data?.name) entries[seg] = data.name
        }
      }
      setDynamicTitles(entries)
    }
    loadDynamic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.join('/')])

  if (segments.length === 0) return null

  let hrefAcc = ''
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400">
      <ol className="flex items-center gap-2">
        {segments.map((seg, idx) => {
          hrefAcc += '/' + seg
          const isLast = idx === segments.length - 1
          const label = dynamicTitles[seg] || titleForSegment(seg)
          return (
            <li key={hrefAcc} className="flex items-center gap-2">
              {idx > 0 && <span className="opacity-60">/</span>}
              {isLast ? (
                <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
              ) : (
                <Link href={hrefAcc} className="hover:underline">
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}


