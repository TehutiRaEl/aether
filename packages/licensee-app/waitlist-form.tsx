'use client'

import { useState, useEffect } from 'react'
import { bootstrapApplication } from '@/lib/appBootstrap'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [licenseStatus, setLicenseStatus] = useState<any>(null)

  useEffect(() => {
    // Bootstrap license check on mount
    bootstrapApplication().then(setLicenseStatus).catch((err) => {
      console.error('Bootstrap failed:', err)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus('success')
        setMessage(data.message || 'You have been added to the waitlist!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  // If license is revoked, show termination screen instead
  if (licenseStatus?.killSwitch) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center ring-1 ring-inset ring-red-600/20">
        <h2 className="text-lg font-semibold text-red-800">License Terminated</h2>
        <p className="mt-2 text-sm text-red-700">{licenseStatus.reason}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {licenseStatus && (
        <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700">
          License: {licenseStatus.status} • Split: {licenseStatus.splitRate?.user}%/{licenseStatus.splitRate?.brand}%
          {licenseStatus.warning && <div className="mt-1 font-semibold">⚠️ {licenseStatus.warning}</div>}
        </div>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          type="email"
          id="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
      </button>
      {status !== 'idle' && (
        <p className={`text-sm text-center ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </form>
  )
}
