'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user has a valid session (from the reset link)
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Invalid or expired reset link. Please request a new password reset.')
      }
    }
    checkSession()
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center text-keyelements-text">Set New Password</h2>
          <p className="mt-2 text-center text-keyelements-text-light">
            Enter your new password below
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">Password reset successful!</p>
              <p className="text-sm mt-1">Redirecting to login...</p>
            </div>
            <Link
              href="/login"
              className="block text-center text-brand-pink hover:text-brand-pink-dark"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-keyelements-text">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-keyelements-text focus:outline-none focus:ring-brand-pink focus:border-brand-pink"
                placeholder="Enter new password"
                minLength={6}
              />
              <p className="mt-1 text-xs text-keyelements-text-light">
                Must be at least 6 characters
              </p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-keyelements-text">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-keyelements-text focus:outline-none focus:ring-brand-pink focus:border-brand-pink"
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-pink hover:bg-brand-pink-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-pink disabled:opacity-50"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-brand-pink hover:text-brand-pink-dark"
              >
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

