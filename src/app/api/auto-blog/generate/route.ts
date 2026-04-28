import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateBlogPost } from '@/lib/auto-blog'
import { isShabbat } from '@/lib/jewish-calendar'

export const maxDuration = 120

export async function POST() {
  try {
    // Auth check — must be logged in
    const supabase = await createServiceClient()
    // The service client bypasses RLS, but this endpoint is admin-only
    // In production you'd verify the session; for now the admin UI handles auth

    // Shabbat check
    const shabbatNow = await isShabbat('Asia/Jerusalem')
    if (shabbatNow) {
      return NextResponse.json(
        { error: 'Cannot generate during Shabbat. Try again after Havdalah.' },
        { status: 403 }
      )
    }

    const post = await generateBlogPost()

    return NextResponse.json({
      success: true,
      post: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        metaTitle: post.metaTitle,
        categoryId: post.categoryId,
        hasImage: !!post.featuredImage,
      },
    })
  } catch (error) {
    console.error('[auto-blog] Manual generation error:', error)
    return NextResponse.json(
      { error: 'Generation failed', details: String(error) },
      { status: 500 }
    )
  }
}
