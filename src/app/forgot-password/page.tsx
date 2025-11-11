'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center text-keyelements-text">Reset Password</h2>
          <p className="mt-2 text-center text-keyelements-text-light">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              <p className="font-medium">Check your email!</p>
              <p className="text-sm mt-1">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm mt-2">
                If you don't see the email, check your spam folder.
              </p>
            </div>
            <Link
              href="/login"
              className="block text-center text-brand-pink hover:text-brand-pink-dark"
            >
              Back to Login
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
              <label htmlFor="email" className="block text-sm font-medium text-keyelements-text">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-keyelements-text focus:outline-none focus:ring-brand-pink focus:border-brand-pink"
                placeholder="your@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-pink hover:bg-brand-pink-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-pink disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
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

