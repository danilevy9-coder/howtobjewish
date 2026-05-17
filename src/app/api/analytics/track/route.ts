import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { path, referrer, visitor_id } = await request.json()

    if (!path) {
      return NextResponse.json({ error: 'path required' }, { status: 400 })
    }

    const userAgent = request.headers.get('user-agent') || null
    const country = request.headers.get('x-vercel-ip-country') || null
    const city = request.headers.get('x-vercel-ip-city') || null

    const supabase = await createServiceClient()

    await supabase.from('page_views').insert({
      path,
      referrer: referrer || null,
      user_agent: userAgent,
      country,
      city,
      visitor_id: visitor_id || null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
  }
}
