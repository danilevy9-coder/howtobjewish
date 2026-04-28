import Link from 'next/link'
import PostCard from '@/components/PostCard'
import { createClient } from '@/lib/supabase/server'

const featuredCategories = [
  {
    name: 'Shabbat',
    href: '/category/shabbat/',
    description: 'Your weekly oasis of rest and spiritual renewal',
    icon: '&#x1F56F;',
    color: 'from-amber-50 to-orange-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
  },
  {
    name: 'Jewish Holidays',
    href: '/category/festivals/',
    description: 'Celebrate the cycle of the Jewish year',
    icon: '&#x2721;',
    color: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
  },
  {
    name: 'Keeping Kosher',
    href: '/category/core-concepts/kashrut/',
    description: 'Practical guides to kosher living',
    icon: '&#x1F33F;',
    color: 'from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
  },
  {
    name: 'Getting Started',
    href: '/category/core-concepts/getting-started/',
    description: 'Begin your journey into Jewish life',
    icon: '&#x1F4D6;',
    color: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
  },
]

export default async function HomePage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug, excerpt, featured_image, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] via-[#1a3a5c] to-[#0f2440]" />
        <div className="absolute inset-0 pattern-bg opacity-20" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 md:py-32 text-center">
          <div className="inline-block mb-6">
            <span className="text-[var(--gold-light)] text-sm font-medium uppercase tracking-[0.3em] border border-[var(--gold)]/30 px-4 py-2 rounded-full">
              Welcome Home
            </span>
          </div>
          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Your Judgment-Free Guide
            <span className="block text-[var(--gold-light)]">to Jewish Life</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: "'Crimson Text', serif" }}>
            Practical, beginner-friendly guides to help you explore and embrace Jewish traditions, holidays, and daily practice.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/where-to-begin-your-jewish-journey/"
              className="px-8 py-3.5 bg-[var(--gold)] text-[var(--foreground)] font-semibold rounded-lg hover:bg-[var(--gold-light)] transition-all shadow-lg hover:shadow-xl"
            >
              Start Your Journey
            </Link>
            <Link
              href="/category/shabbat/"
              className="px-8 py-3.5 border-2 border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              Explore Shabbat
            </Link>
          </div>
        </div>
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="var(--background)" />
          </svg>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-20">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Explore Jewish Life
          </h2>
          <div className="ornament-divider max-w-xs mx-auto">
            <span>&#10022;</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCategories.map((cat) => (
            <Link
              key={cat.href}
              href={cat.href}
              className={`group p-6 bg-gradient-to-br ${cat.color} border ${cat.borderColor} rounded-xl card-lift text-center`}
            >
              <div
                className="text-4xl mb-4"
                dangerouslySetInnerHTML={{ __html: cat.icon }}
              />
              <h3
                className={`text-lg font-bold mb-2 ${cat.textColor} group-hover:opacity-80 transition-colors`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {cat.name}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed" style={{ fontFamily: "'Crimson Text', serif" }}>
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Articles */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2
                className="text-3xl md:text-4xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Latest Articles
              </h2>
              <div className="w-16 h-1 bg-[var(--gold)] mt-3 rounded-full" />
            </div>
            <Link
              href="/category/core-concepts/"
              className="hidden sm:block text-sm font-semibold text-[var(--accent)] hover:text-[var(--gold)] transition-colors uppercase tracking-wider"
            >
              View All &rarr;
            </Link>
          </div>
          {posts && posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  title={post.title}
                  slug={post.slug}
                  excerpt={post.excerpt}
                  featuredImage={post.featured_image}
                  publishedAt={post.published_at}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[var(--cream)] rounded-xl border border-[var(--border)]">
              <div className="text-5xl mb-4">&#x1F4DA;</div>
              <p className="text-lg text-gray-600 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>No articles published yet.</p>
              <p className="text-sm text-gray-400">Import your WordPress content or generate new articles from the admin dashboard.</p>
            </div>
          )}
        </div>
      </section>

      {/* Quote / Mission */}
      <section className="py-16 md:py-20 pattern-bg">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="text-5xl text-[var(--gold)] mb-6">&ldquo;</div>
          <blockquote
            className="text-2xl md:text-3xl text-[var(--foreground)] leading-relaxed mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            The Torah was not given to angels. It was given to human beings, with all their questions and imperfections.
          </blockquote>
          <p className="text-[var(--gold)] font-medium uppercase tracking-wider text-sm">
            &mdash; Talmudic Teaching
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-[#0f2440]" />
        <div className="absolute inset-0 pattern-bg opacity-10" />
        <div className="relative max-w-2xl mx-auto px-4 py-16 md:py-20 text-center">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4 text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Stay Connected
          </h2>
          <p className="text-blue-100/70 mb-8 text-lg" style={{ fontFamily: "'Crimson Text', serif" }}>
            Get weekly guides and insights on Jewish life delivered to your inbox. No spam, just wisdom.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-5 py-3.5 rounded-lg text-gray-900 bg-white border-0 focus:ring-2 focus:ring-[var(--gold)] text-sm"
            />
            <button
              type="button"
              className="px-6 py-3.5 bg-[var(--gold)] text-[var(--foreground)] font-semibold rounded-lg hover:bg-[var(--gold-light)] transition-colors shadow-lg"
            >
              Subscribe
            </button>
          </form>
          <p className="text-blue-200/40 text-xs mt-4">Join thousands of readers on their Jewish journey</p>
        </div>
      </section>
    </div>
  )
}
