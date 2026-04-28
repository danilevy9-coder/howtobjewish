import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://howtobjewish.org'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return [{ url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 }]
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const { data: categories } = await supabase
    .from('categories')
    .select('slug')

  const staticPages = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${siteUrl}/about/`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${siteUrl}/contact/`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${siteUrl}/shop/`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
  ]

  const postPages = (posts || []).map((post) => ({
    url: `${siteUrl}/${post.slug}/`,
    lastModified: new Date(post.updated_at || post.published_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const categoryPages = (categories || []).map((cat) => ({
    url: `${siteUrl}/${cat.slug}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...postPages, ...categoryPages]
}
