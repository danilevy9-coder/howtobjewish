'use client'

import { useState } from 'react'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (res.ok) {
        setStatus('sent')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-white font-medium text-lg py-3">
        You&apos;re subscribed! Check your inbox for a welcome email.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        className="flex-1 px-5 py-3.5 rounded-lg text-gray-900 bg-white border-0 focus:ring-2 focus:ring-[var(--gold)] text-sm"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="px-6 py-3.5 bg-[var(--gold)] text-[var(--foreground)] font-semibold rounded-lg hover:bg-[var(--gold-light)] transition-colors shadow-lg disabled:opacity-50"
      >
        {status === 'sending' ? 'Subscribing...' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p className="text-red-300 text-xs sm:absolute sm:mt-14">Something went wrong. Try again.</p>
      )}
    </form>
  )
}
