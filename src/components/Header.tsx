import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold text-gray-900 hover:text-gray-700">
          Max
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/projects" className="text-gray-600 hover:text-gray-900">
            Projects
          </Link>
          <Link href="/insight" className="text-gray-600 hover:text-gray-900">
            Insights
          </Link>
        </nav>
      </div>
    </header>
  )
}

