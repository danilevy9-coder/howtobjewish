import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { createPublicClient as createClient, SITE_URL, SITE_NAME, absoluteUrl, postDescription, lazyImages, extractFaq, partnerLinks, jsonLd, REDIRECTED_SLUGS } from '@/lib/site'
import type { Metadata } from 'next'

// Cache each guide and refresh it in the background every 15 minutes.
export const revalidate = 900
export async function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('title, excerpt, content, meta_title, meta_description, featured_image, published_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) return { title: 'Not Found', robots: { index: false } }

  const title = post.meta_title || post.title
  const description = postDescription(post)
  const url = `/${slug}/`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      siteName: SITE_NAME,
      title,
      description,
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || post.published_at || undefined,
      images: post.featured_image ? [{ url: post.featured_image }] : undefined,
    },
    twitter: {
      card: post.featured_image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select(`*, authors ( name, avatar_url )`)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  // Auto-decode base64-encoded content (used when content proxy blocks large HTML updates)
  const B64_MARKER = '<!--B64-->'
  if (post.content && post.content.startsWith(B64_MARKER)) {
    post.content = Buffer.from(post.content.substring(B64_MARKER.length), 'base64').toString('utf8')
  }

  // Strip markdown code fences if content was stored with them
  if (post.content && post.content.startsWith('```html')) {
    post.content = post.content.replace(/^```html\n?/, '').replace(/\n?```$/, '')
  }

  // Get categories for this post
  const { data: postCategories } = await supabase
    .from('post_categories')
    .select('category_id, categories ( name, slug, parent_id )')
    .eq('post_id', post.id)

  // Related guides: same categories first, then the newest guides as a fallback.
  const categoryIds: string[] = postCategories?.map((pc: { category_id: string }) => pc.category_id) || []
  type Related = { id: string; title: string; slug: string; featured_image: string | null }
  let relatedPosts: Related[] = []
  const skip = (rp: Related) => rp.id === post.id || REDIRECTED_SLUGS.has(rp.slug) || rp.slug === slug

  if (categoryIds.length > 0) {
    const { data: relatedPostCategories } = await supabase
      .from('post_categories')
      .select('post_id')
      .in('category_id', categoryIds)
      .neq('post_id', post.id)
      .limit(200)

    if (relatedPostCategories && relatedPostCategories.length > 0) {
      const relatedIds = [...new Set(relatedPostCategories.map((rpc: { post_id: string }) => rpc.post_id))].slice(0, 100)
      const { data: rpData } = await supabase
        .from('posts')
        .select('id, title, slug, featured_image')
        .in('id', relatedIds)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      relatedPosts = (rpData || []).filter((rp: Related) => !skip(rp)).slice(0, 4)
    }
  }
  if (relatedPosts.length < 4) {
    const { data: latest } = await supabase
      .from('posts')
      .select('id, title, slug, featured_image')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(12)
    for (const rp of (latest || []) as Related[]) {
      if (relatedPosts.length >= 4) break
      if (!skip(rp) && !relatedPosts.some((r) => r.id === rp.id)) relatedPosts.push(rp)
    }
  }

  const author = post.authors as { name: string; avatar_url: string | null } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories: { name: string; slug: string; parent_id?: string | null }[] = postCategories?.map((pc: any) => {
    const cat = Array.isArray(pc.categories) ? pc.categories[0] : pc.categories
    return cat as { name: string; slug: string; parent_id?: string | null }
  }).filter(Boolean) || []

  // Structured data: Article, BreadcrumbList and (only where the guide has a Q&A section) FAQPage.
  const pageUrl = `${SITE_URL}/${slug}/`
  const description = postDescription(post)
  let crumbParent: { name: string; slug: string } | null = null
  const mainCat = categories[0]
  if (mainCat?.parent_id) {
    const { data: parent } = await supabase.from('categories').select('name, slug').eq('id', mainCat.parent_id).single()
    crumbParent = parent
  }
  const crumbs: { name: string; url: string }[] = [{ name: 'Home', url: `${SITE_URL}/` }]
  if (mainCat) {
    if (crumbParent) crumbs.push({ name: crumbParent.name, url: `${SITE_URL}/category/${crumbParent.slug}/` })
    crumbs.push({ name: mainCat.name, url: `${SITE_URL}/category/${crumbParent ? crumbParent.slug + '/' : ''}${mainCat.slug}/` })
  }
  crumbs.push({ name: post.title, url: pageUrl })
  const faq = extractFaq(post.content || '')
  const structuredData: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description,
      mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
      url: pageUrl,
      ...(post.featured_image ? { image: [absoluteUrl(post.featured_image)] } : {}),
      ...(post.published_at ? { datePublished: post.published_at } : {}),
      ...(post.updated_at || post.published_at ? { dateModified: post.updated_at || post.published_at } : {}),
      ...(mainCat ? { articleSection: mainCat.name } : {}),
      inLanguage: 'en',
      author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
    },
  ]
  if (faq.length > 0) {
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
  }
  const partners = partnerLinks(categories.map((c) => c.slug))

  return (
    <article className="bg-white">
      {structuredData.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLd(d)} />
      ))}
      {/* Article Header */}
      <header className="max-w-4xl mx-auto px-4 pt-10 pb-6">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 mb-5">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}/`}
                className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gold)] hover:text-[var(--accent)] transition-colors border border-[var(--gold-light)] px-3 py-1 rounded-full"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1
          className="text-3xl md:text-5xl lg:text-[3.25rem] font-bold mb-5 text-[var(--foreground)] leading-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {post.title}
        </h1>

        {/* Author & Date */}
        <div className="flex items-center gap-4 text-sm">
          {author && (
            <div className="flex items-center gap-2">
              {author.avatar_url ? (
                <Image
                  src={author.avatar_url}
                  alt={author.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
                  {author.name.charAt(0)}
                </div>
              )}
              <span className="font-medium text-[var(--foreground)]">{author.name}</span>
            </div>
          )}
          {post.published_at && (
            <>
              {author && <span className="text-[var(--gold)]">&#x2022;</span>}
              <time className="text-[var(--muted)]">
                {format(new Date(post.published_at), 'MMMM d, yyyy')}
              </time>
            </>
          )}
        </div>
      </header>

      {/* Featured Image */}
      {post.featured_image && (
        <div className="max-w-5xl mx-auto px-4 mb-10">
          <div className="relative aspect-[21/9] rounded-xl overflow-hidden shadow-lg">
            <Image
              src={post.featured_image}
              alt={post.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 1000px"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: lazyImages(post.content || '') }}
        />
      </div>

      {/* Related sites, only on guides where they fit */}
      {partners.length > 0 && (
        <aside className="max-w-3xl mx-auto px-4 pb-10">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--cream)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gold)] mb-3">Also from our family of sites</p>
            <ul className="space-y-2">
              {partners.map((p) => (
                <li key={p.href} className="text-sm text-[var(--muted)]">
                  <a href={p.href} target="_blank" rel="noopener" className="font-semibold text-[var(--accent)] hover:underline">{p.name}</a>
                  {': '}{p.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      {/* Divider */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="ornament-divider">
          <span>&#10022;</span>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <h2
            className="text-2xl font-bold mb-8 text-center"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Continue Reading
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.id}
                href={`/${rp.slug}/`}
                className="group bg-[var(--cream)] rounded-xl overflow-hidden card-lift border border-[var(--border)]"
              >
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                  {rp.featured_image ? (
                    <Image
                      src={rp.featured_image}
                      alt={rp.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="250px"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-[#2d5a8e] flex items-center justify-center">
                      <span className="text-white/20 text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>HTB</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3
                    className="text-sm font-bold group-hover:text-[var(--accent)] transition-colors leading-snug line-clamp-2"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {rp.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
