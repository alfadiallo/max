import Link from 'next/link'

interface BackLinkProps {
  href: string
  label?: string
}

export function BackLink({ href, label = 'Back to Dashboard' }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
    >
      <span>←</span>
      <span>{label}</span>
    </Link>
  )
}

