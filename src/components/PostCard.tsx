import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'

interface PostCardProps {
  title: string
  slug: string
  excerpt?: string | null
  featuredImage?: string | null
  publishedAt?: string | null
  categoryName?: string
}

export default function PostCard({
  title,
  slug,
  excerpt,
  featuredImage,
  publishedAt,
  categoryName,
}: PostCardProps) {
  return (
    <article className="group bg-white rounded-xl overflow-hidden card-lift border border-[var(--border)]">
      <Link href={`/${slug}/`}>
        <div className="relative aspect-[16/10] bg-[var(--cream)] overflow-hidden">
          {featuredImage ? (
            <Image
              src={featuredImage}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] to-[#2d5a8e] flex items-center justify-center">
              <div className="text-center">
                <span className="text-white/30 text-6xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>HTB</span>
              </div>
            </div>
          )}
          {categoryName && (
            <div className="absolute top-3 left-3">
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/90 backdrop-blur-sm text-[var(--accent)] px-3 py-1 rounded-full shadow-sm">
                {categoryName}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-5">
        {publishedAt && (
          <time className="text-xs text-[var(--gold)] font-medium uppercase tracking-wider">
            {format(new Date(publishedAt), 'MMMM d, yyyy')}
          </time>
        )}

        <Link href={`/${slug}/`}>
          <h3
            className="text-lg font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors mt-2 mb-2 line-clamp-2 leading-snug"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title}
          </h3>
        </Link>

        {excerpt && (
          <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed" style={{ fontFamily: "'Crimson Text', serif" }}>
            {excerpt}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <Link
            href={`/${slug}/`}
            className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] hover:text-[var(--gold)] transition-colors"
          >
            Read Article &rarr;
          </Link>
        </div>
      </div>
    </article>
  )
}
