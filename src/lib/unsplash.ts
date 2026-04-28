interface UnsplashPhoto {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
  }
  alt_description: string | null
  user: {
    name: string
    links: { html: string }
  }
}

export async function searchPhoto(query: string): Promise<UnsplashPhoto | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) throw new Error('UNSPLASH_ACCESS_KEY not set')

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
    }
  )

  if (!res.ok) {
    console.error('Unsplash error:', res.status, await res.text())
    return null
  }

  const data = await res.json()
  return data.results?.[0] || null
}

export async function getPhotoUrl(query: string): Promise<string | null> {
  const photo = await searchPhoto(query)
  return photo?.urls?.regular || null
}
