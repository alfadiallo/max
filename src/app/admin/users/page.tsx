'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AdminUsersPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('Editor')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          router.push('/login')
        } else if (!user) {
          router.push('/login')
        } else {
          // Check if user is admin
          const userRole = user.user_metadata?.role
          if (userRole !== 'Admin' && userRole !== 'admin') {
            router.push('/dashboard')
          } else {
            setUser(user)
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        router.push('/login')
      }
    }
    getUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteMessage(null)

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          role: inviteRole
        })
      })

      const result = await response.json()

      if (result.success) {
        setInviteMessage({ type: 'success', text: result.message || 'User invited successfully!' })
        setInviteEmail('')
        setInviteName('')
        setInviteRole('Editor')
      } else {
        setInviteMessage({ type: 'error', text: result.error || 'Failed to invite user' })
      }
    } catch (error: any) {
      setInviteMessage({ type: 'error', text: error.message || 'Failed to invite user' })
    } finally {
      setInviteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <a href="/dashboard" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
            ← Back to Dashboard
          </a>
        </div>

        <h1 className="text-3xl font-bold mb-8 dark:text-gray-100">Manage Users</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">Invite New User</h2>
          
          <form onSubmit={handleInvite} className="space-y-4">
            {inviteMessage && (
              <div className={`p-4 rounded-lg ${
                inviteMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200'
                  : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200'
              }`}>
                {inviteMessage.text}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 dark:text-gray-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1 dark:text-gray-200">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-1 dark:text-gray-200">
                Role
              </label>
              <select
                id="role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="Editor">Editor</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={inviteLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviteLoading ? 'Inviting...' : 'Send Invitation'}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">Existing Users</h2>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage users from the Supabase dashboard:
          </p>
          <a 
            href="https://app.supabase.com/project/sutzvbpsflwqdzcjtscr/auth/users" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2 inline-block"
          >
            Open Supabase Users →
          </a>
        </div>
      </main>
    </div>
  )
}

