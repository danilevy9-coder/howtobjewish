import type { MetadataRoute } from 'next'
import { createPublicClient, SITE_URL, REDIRECTED_SLUGS, RESERVED_SLUGS } from '@/lib/site'

// Rebuilt at most once an hour, so new guides appear without a redeploy.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return [{ url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 }]
  }

  const supabase = createPublicClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5000)

  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug, parent_id')

  const newest = (posts || []).reduce((m, p) => {
    const t = new Date(p.updated_at || p.published_at || 0).getTime()
    return t > m ? t : m
  }, 0)
  const siteUpdated = newest ? new Date(newest) : new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: siteUpdated, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/about/`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact/`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/shop/`, changeFrequency: 'weekly', priority: 0.5 },
  ]

  const postPages: MetadataRoute.Sitemap = (posts || [])
    .filter((post) => post.slug && !REDIRECTED_SLUGS.has(post.slug) && !RESERVED_SLUGS.has(post.slug))
    .map((post) => ({
      url: `${SITE_URL}/${post.slug}/`,
      lastModified: new Date(post.updated_at || post.published_at || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.8,
    }))

  const byId = new Map((categories || []).map((c) => [c.id, c]))
  const categoryPages: MetadataRoute.Sitemap = (categories || []).map((cat) => {
    const parent = cat.parent_id ? byId.get(cat.parent_id) : null
    return {
      url: `${SITE_URL}/category/${parent ? parent.slug + '/' : ''}${cat.slug}/`,
      changeFrequency: 'weekly',
      priority: 0.6,
    }
  })

  return [...staticPages, ...postPages, ...categoryPages]
}
