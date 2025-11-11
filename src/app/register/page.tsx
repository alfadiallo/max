'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.user) {
      // Success! Account created
      setSuccess('Account created! Redirecting...')
      
      // Try to login immediately if email confirmation is disabled
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (!signInError) {
        router.push('/dashboard')
      } else {
        // Email confirmation required - show message
        setError('Please check your email to confirm your account before signing in.')
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center text-keyelements-text">KEY ELEMENTS</h2>
          <p className="mt-2 text-center text-keyelements-text-light">Create your account</p>
        </div>
        <form onSubmit={handleRegister} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-keyelements-text">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-keyelements-text focus:outline-none focus:ring-brand-pink focus:border-brand-pink"
            />
          </div>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-pink hover:bg-brand-pink-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-pink disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-keyelements-text-light">
          Already have an account?{' '}
          <a href="/login" className="text-brand-pink hover:text-brand-pink-dark">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

