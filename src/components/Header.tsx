import Link from 'next/link'
import ThemeToggle from './ThemeToggle'
import Breadcrumbs from './Breadcrumbs'

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white dark:bg-gray-950 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300 whitespace-nowrap">
            Max
          </Link>
          <div className="hidden sm:block truncate">
            <Breadcrumbs />
          </div>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hidden md:inline">
            Dashboard
          </Link>
          <Link href="/projects" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hidden md:inline">
            Projects
          </Link>
          <Link href="/insight" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hidden md:inline">
            Insights
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}

