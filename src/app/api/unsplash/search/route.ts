import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q) {
    return NextResponse.json({ results: [] })
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) {
    return NextResponse.json({ error: 'Unsplash not configured' }, { status: 500 })
  }

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&orientation=landscape`,
    { headers: { Authorization: `Client-ID ${accessKey}` } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Unsplash search failed' }, { status: 502 })
  }

  const data = await res.json()

  return NextResponse.json({
    results: data.results?.map((photo: {
      id: string
      urls: { small: string; regular: string }
      alt_description: string | null
      user: { name: string; links: { html: string } }
    }) => ({
      id: photo.id,
      urls: { small: photo.urls.small, regular: photo.urls.regular },
      alt_description: photo.alt_description,
      user: { name: photo.user.name },
    })) || [],
  })
}
