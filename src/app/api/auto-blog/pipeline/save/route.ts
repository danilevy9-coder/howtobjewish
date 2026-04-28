import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getSettings, updateSettings } from '@/lib/auto-blog'
import { verifyPipelineAuth, type PipelineState } from '@/lib/auto-blog-pipeline'

export const maxDuration = 60

export async function POST(request: Request) {
  if (!verifyPipelineAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state: PipelineState = await request.json()
    console.log(`[auto-blog:${state.runId}] Step 5: Saving to DB`)

    const supabase = await createServiceClient()
    const settings = state.settings

    // Resolve category
    const matchedCat = state.categories.find((c) => c.slug === state.plan!.categorySlug)
    const categoryId = matchedCat?.id || null

    // Generate slug
    const slug = state.article!.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80)

    // Get default author
    const { data: author } = await supabase
      .from('authors')
      .select('id')
      .limit(1)
      .single()

    // Save to DB
    const status = settings.auto_publish ? 'published' : 'queued'
    const publishedAt = settings.auto_publish ? new Date().toISOString() : null

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title: state.article!.title,
        slug,
        content: state.article!.content,
        excerpt: state.article!.excerpt,
        meta_title: state.article!.metaTitle,
        meta_description: state.metaDescription,
        featured_image: state.featuredImage || null,
        author_id: author?.id || null,
        status,
        published_at: publishedAt,
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to save post: ${error.message}`)
    }

    // Assign category
    if (categoryId && post) {
      await supabase
        .from('post_categories')
        .insert({ post_id: post.id, category_id: categoryId })
    }

    // Schedule next run
    const minMs = settings.min_hours_between * 60 * 60 * 1000
    const maxMs = settings.max_hours_between * 60 * 60 * 1000
    const randomMs = minMs + Math.random() * (maxMs - minMs)
    const nextGenerateAfter = new Date(Date.now() + randomMs).toISOString()

    await updateSettings({
      last_generated_at: new Date().toISOString(),
      next_generate_after: nextGenerateAfter,
      last_topic_type: state.effectiveType,
    })

    console.log(`[auto-blog:${state.runId}] Done! "${state.article!.title}" (${status})`)

    return NextResponse.json({
      step: 'save',
      runId: state.runId,
      success: true,
      post: { title: state.article!.title, slug, status },
    })
  } catch (error) {
    console.error('[auto-blog] save failed:', error)
    return NextResponse.json(
      { error: 'save failed', details: String(error) },
      { status: 500 }
    )
  }
}
