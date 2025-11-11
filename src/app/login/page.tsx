'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Redirect based on user role
      const userRole = data.user?.user_metadata?.role
      if (userRole === 'Editor' || userRole === 'editor') {
        router.push('/projects')
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center text-keyelements-text">KEY ELEMENTS</h2>
          <p className="mt-2 text-center text-keyelements-text-light">Sign in to your account</p>
        </div>
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
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
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-keyelements-text">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-keyelements-text focus:outline-none focus:ring-brand-pink focus:border-brand-pink"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="/forgot-password" className="font-medium text-brand-pink hover:text-brand-pink-dark">
                Forgot your password?
              </a>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-pink hover:bg-brand-pink-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-pink disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-keyelements-text-light">
          Don't have an account?{' '}
          <a href="/register" className="text-brand-pink hover:text-brand-pink-dark">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}

