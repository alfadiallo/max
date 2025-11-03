'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string
  role: string | null
  email_confirmed_at: string | null
  created_at: string
  last_sign_in_at: string | null
  in_max_users: boolean
}

export default function AdminUsersPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('Editor')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
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
            loadUsers() // Load users list after admin verification
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

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      const result = await response.json()
      
      if (result.success && result.data?.users) {
        setUsers(result.data.users)
      } else {
        console.error('Failed to load users:', result.error)
      }
    } catch (error: any) {
      console.error('Error loading users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string, currentFullName: string) => {
    setUpdatingUserId(userId)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: newRole,
          full_name: currentFullName
        })
      })

      const result = await response.json()

      if (result.success) {
        setInviteMessage({ type: 'success', text: `User role updated to ${newRole}` })
        await loadUsers() // Refresh users list
      } else {
        setInviteMessage({ type: 'error', text: result.error || 'Failed to update user role' })
      }
    } catch (error: any) {
      setInviteMessage({ type: 'error', text: error.message || 'Failed to update user role' })
    } finally {
      setUpdatingUserId(null)
    }
  }

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
        await loadUsers() // Refresh users list
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-gray-100">Existing Users</h2>
            <button
              onClick={loadUsers}
              disabled={usersLoading}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              {usersLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {usersLoading ? (
            <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="py-2 px-4 dark:text-gray-200">Email</th>
                    <th className="py-2 px-4 dark:text-gray-200">Full Name</th>
                    <th className="py-2 px-4 dark:text-gray-200">Role</th>
                    <th className="py-2 px-4 dark:text-gray-200">Status</th>
                    <th className="py-2 px-4 dark:text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b dark:border-gray-700">
                      <td className="py-2 px-4 dark:text-gray-300">{u.email}</td>
                      <td className="py-2 px-4 dark:text-gray-300">{u.full_name || '-'}</td>
                      <td className="py-2 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          u.role === 'Admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : u.role === 'Editor'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {u.role || 'No Role'}
                        </span>
                        {!u.in_max_users && (
                          <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">(Not in max_users)</span>
                        )}
                      </td>
                      <td className="py-2 px-4 dark:text-gray-300">
                        {u.email_confirmed_at ? (
                          <span className="text-green-600 dark:text-green-400 text-sm">Confirmed</span>
                        ) : (
                          <span className="text-orange-600 dark:text-orange-400 text-sm">Pending</span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {u.role !== 'Admin' && u.role !== 'Editor' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateRole(u.id, 'Editor', u.full_name)}
                              disabled={updatingUserId === u.id}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {updatingUserId === u.id ? 'Updating...' : 'Set as Editor'}
                            </button>
                            <button
                              onClick={() => handleUpdateRole(u.id, 'Admin', u.full_name)}
                              disabled={updatingUserId === u.id}
                              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                            >
                              {updatingUserId === u.id ? 'Updating...' : 'Set as Admin'}
                            </button>
                          </div>
                        ) : (
                          <select
                            value={u.role || ''}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value, u.full_name)}
                            disabled={updatingUserId === u.id}
                            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50"
                          >
                            <option value="Editor">Editor</option>
                            <option value="Admin">Admin</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              You can also manage users directly from the Supabase dashboard:
            </p>
            <a 
              href="https://app.supabase.com/project/sutzvbpsflwqdzcjtscr/auth/users" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm"
            >
              Open Supabase Users →
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

