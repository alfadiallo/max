'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  // Initialize from localStorage or system
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme')
      const initialDark = saved ? saved === 'dark' : getSystemPrefersDark()
      setIsDark(initialDark)
      const root = document.documentElement
      root.classList.toggle('dark', initialDark)
    } catch {
      // ignore
    }
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    const root = document.documentElement
    root.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex items-center gap-2 px-3 py-1 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <>
          <Moon className="h-4 w-4" />
          Dark
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          Light
        </>
      )}
    </button>
  )
}


