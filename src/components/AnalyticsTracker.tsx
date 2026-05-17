'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

function getVisitorId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem('htbj_vid')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('htbj_vid', id)
  }
  return id
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (pathname === lastPath.current) return
    if (pathname.startsWith('/admin') || pathname.startsWith('/login')) return
    lastPath.current = pathname

    const visitorId = getVisitorId()

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
        visitor_id: visitorId,
      }),
    }).catch(() => {})
  }, [pathname])

  return null
}
