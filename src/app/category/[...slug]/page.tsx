import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PostCard from '@/components/PostCard'
import Link from 'next/link'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const categorySlug = slug[slug.length - 1]
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('name, description')
    .eq('slug', categorySlug)
    .single()

  if (!category) return { title: 'Category Not Found' }

  return {
    title: category.name,
    description: category.description || `Browse all articles about ${category.name} on How to Be Jewish.`,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const categorySlug = slug[slug.length - 1]
  const supabase = await createClient()

  // Get the category
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, description, parent_id')
    .eq('slug', categorySlug)
    .single()

  if (!category) notFound()

  // Get parent category if this is a child
  let parentCategory: { name: string; slug: string } | null = null
  if (category.parent_id) {
    const { data: parent } = await supabase
      .from('categories')
      .select('name, slug')
      .eq('id', category.parent_id)
      .single()
    parentCategory = parent
  }

  // Get child categories
  const { data: childCategories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('parent_id', category.id)
    .order('sort_order')
    .order('name')

  // Get posts in this category
  const { data: postCategories } = await supabase
    .from('post_categories')
    .select('post_id')
    .eq('category_id', category.id)

  const postIds = postCategories?.map((pc: { post_id: string }) => pc.post_id) || []

  let posts: { id: string; title: string; slug: string; excerpt: string | null; featured_image: string | null; published_at: string | null }[] = []

  if (postIds.length > 0) {
    const { data } = await supabase
      .from('posts')
      .select('id, title, slug, excerpt, featured_image, published_at')
      .in('id', postIds)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    posts = data || []
  }

  // Also get posts from child categories
  const childCatIds = childCategories?.map((c: { id: string }) => c.id) || []
  if (childCatIds.length > 0) {
    const { data: childPostCats } = await supabase
      .from('post_categories')
      .select('post_id')
      .in('category_id', childCatIds)

    const childPostIds = childPostCats
      ?.map((pc: { post_id: string }) => pc.post_id)
      .filter((id: string) => !postIds.includes(id)) || []

    if (childPostIds.length > 0) {
      const { data: childPosts } = await supabase
        .from('posts')
        .select('id, title, slug, excerpt, featured_image, published_at')
        .in('id', childPostIds)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (childPosts) {
        posts = [...posts, ...childPosts]
      }
    }
  }

  // Build breadcrumb path
  const breadcrumbs: { name: string; href: string }[] = []
  if (parentCategory) {
    breadcrumbs.push({
      name: parentCategory.name,
      href: `/category/${parentCategory.slug}/`,
    })
  }
  breadcrumbs.push({ name: category.name, href: '' })

  return (
    <div>
      {/* Category Header */}
      <div className="bg-gradient-to-br from-[var(--accent)] to-[#0f2440] text-white py-14 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pattern-bg opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <nav className="flex items-center gap-2 text-sm text-blue-200/60 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="text-[var(--gold)]/50">/</span>
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-white transition-colors">{crumb.name}</Link>
                  ) : (
                    <span className="text-white">{crumb.name}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <h1
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {category.name}
          </h1>
          {category.description && (
            <p className="text-blue-100/70 text-lg max-w-2xl" style={{ fontFamily: "'Crimson Text', serif" }}>
              {category.description}
            </p>
          )}
          <div className="w-16 h-1 bg-[var(--gold)] mt-6 rounded-full" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
        {/* Child Categories */}
        {childCategories && childCategories.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--muted)] mb-4">Browse Topics</h2>
            <div className="flex flex-wrap gap-3">
              {childCategories.map((child: { id: string; name: string; slug: string }) => {
                const childHref = parentCategory
                  ? `/category/${parentCategory.slug}/${child.slug}/`
                  : `/category/${category.slug}/${child.slug}/`
                return (
                  <Link
                    key={child.id}
                    href={childHref}
                    className="px-5 py-2.5 bg-white text-[var(--accent)] rounded-full text-sm font-medium border border-[var(--border)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors shadow-sm"
                  >
                    {child.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                title={post.title}
                slug={post.slug}
                excerpt={post.excerpt}
                featuredImage={post.featured_image}
                publishedAt={post.published_at}
                categoryName={category.name}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[var(--cream)] rounded-xl border border-[var(--border)]">
            <div className="text-5xl mb-4">&#x1F4DA;</div>
            <p className="text-lg text-gray-600" style={{ fontFamily: "'Playfair Display', serif" }}>
              No articles in this category yet.
            </p>
            <p className="text-sm text-gray-400 mt-2">Check back soon for new content.</p>
          </div>
        )}
      </div>
    </div>
  )
}
